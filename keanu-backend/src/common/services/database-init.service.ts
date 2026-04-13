import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { seedProjects } from '../../../prisma/seeds/projects.seed';
import { seedReservations } from '../../../prisma/seeds/reservations.seed';
import { seedShortlists } from '../../../prisma/seeds/shortlists.seed';
import { seedUnits } from '../../../prisma/seeds/units.seed';
import { seedUsers } from '../../../prisma/seeds/users.seed';
import { seedStatistics } from '../../../prisma/seeds/statistics.seed';
import { seedUserManipulation } from '../../../prisma/seeds/user-manipulation.seed';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseInitService {
  private readonly logger = new Logger(DatabaseInitService.name);
  private isInitialized = false; // Flag to ensure it only runs once
  private initializationPromise: Promise<void> | null = null; // Prevent concurrent runs

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    // Prevent multiple concurrent initializations
    if (this.isInitialized) {
      this.logger.log('=== Database already initialized, skipping...');
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      this.logger.log('=== Database initialization already in progress, waiting...');
      await this.initializationPromise;
      return;
    }

    // Start initialization and store the promise
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  private async initialize() {
    this.logger.log('=== Starting database initialization...');

    try {
      // Ensure database connection is ready
      await this.ensureDatabaseConnection();

      // Step 1: Generate Prisma Client (always safe to run)
      await this.generatePrismaClient();

      // Step 2: Check and run migrations if needed
      await this.runMigrationsIfNeeded();

      // Step 3: Check and run seeding if needed
      await this.seedIfNeeded();

      // this.logger.log('=== Database initialization completed successfully!');
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('=== Database initialization failed:', error);
      this.initializationPromise = null; // Reset on error to allow retry
      throw error;
    }
  }

  /**
   * Ensure database connection is ready
   */
  private async ensureDatabaseConnection(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds

    // Log masked DATABASE_URL for debugging
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    this.logger.log(`=== DATABASE_URL: ${maskedUrl}`);

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try a simple query to check connection
        await this.prisma.$queryRaw`SELECT 1`;
        this.logger.log('=== Database connection established');
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (i < maxRetries - 1) {
          this.logger.warn(`=== Database connection not ready, retrying in ${retryDelay}ms... (${i + 1}/${maxRetries}) - Error: ${errorMessage}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`=== Final connection error: ${errorMessage}`);
          throw new Error('Failed to establish database connection after multiple retries');
        }
      }
    }
  }

  /**
   * Generate Prisma Client
   */
  private async generatePrismaClient(): Promise<void> {
    try {
      this.logger.log('=== Generating Prisma Client...');
      await execAsync('npx prisma generate');
      // this.logger.log('=== Prisma Client generated successfully');
    } catch (error) {
      this.logger.warn('===Prisma Client generation failed (may already be generated):', error);
      // Don't throw, as client might already be generated
    }
  }

  /**
   * Check if migrations are needed and run them
   */
  private async runMigrationsIfNeeded(): Promise<void> {
    try {
      // Check if migration files exist
      const migrationFilesExist = await this.checkMigrationFilesExist();

      // Check if _prisma_migrations table exists (indicates database is initialized)
      const migrationsTableExists = await this.checkMigrationsTableExists();

      // Check if database has tables (indicates schema is already applied)
      const hasTables = await this.checkDatabaseHasTables();

      if (!migrationFilesExist && !migrationsTableExists && !hasTables) {
        // No migration files, no migration history, no tables - create initial migration
        this.logger.log('=== No migration files found. Creating initial migration...');
        try {
          await execAsync('npx prisma migrate dev --name init --create-only');
          // this.logger.log('=== Initial migration created successfully');

          // Apply the migration
          this.logger.log('=== Applying migration...');
          await execAsync('npx prisma migrate deploy');
          // this.logger.log('=== Migration applied successfully');
        } catch (error: any) {
          // If migration creation fails due to drift, use db push instead
          if (error.message?.includes('Drift detected') || error.message?.includes('not in sync')) {
            this.logger.warn('=== Migration drift detected. Using db push to sync schema...');
            await execAsync('npx prisma db push --skip-generate');
            // this.logger.log('=== Schema synced successfully');
          } else {
            throw error;
          }
        }
      } else if (!migrationFilesExist && (migrationsTableExists || hasTables)) {
        // No migration files but database has schema - use db push to sync
        this.logger.log('=== No migration files but database has schema. Syncing with db push...');
        await execAsync('npx prisma db push --skip-generate');
        // this.logger.log('=== Schema synced successfully');
      } else if (migrationFilesExist && !migrationsTableExists) {
        // Migration files exist but database is not initialized
        // Check if database has tables - if yes, baseline; if no, deploy
        if (hasTables) {
          this.logger.log('=== Database has tables but no migration history. Baselining...');
          // Get the migration name to baseline
          const fs = await import('fs/promises');
          const path = await import('path');
          const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
          const entries = await fs.readdir(migrationsPath, { withFileTypes: true });
          const migrationDirs = entries
            .filter(entry => entry.isDirectory() && /^\d/.test(entry.name))
            .map(entry => entry.name)
            .sort();

          // Baseline each migration as already applied
          for (const migrationDir of migrationDirs) {
            this.logger.log(`  ... Marking migration "${migrationDir}" as applied`);
            await execAsync(`npx prisma migrate resolve --applied "${migrationDir}"`);
          }
          // this.logger.log('=== Database baselined successfully');
        } else {
          this.logger.log('=== Database not initialized. Running migrations...');
          await execAsync('npx prisma migrate deploy');
          // this.logger.log('=== Migrations completed successfully');
        }
      } else if (migrationFilesExist && migrationsTableExists) {
        // Check if there are pending migrations by comparing migration files with applied migrations
        const hasPendingMigrations = await this.checkPendingMigrations();

        if (hasPendingMigrations) {
          this.logger.log('=== Pending migrations found. Running migrations...');
          await execAsync('npx prisma migrate deploy');
          // this.logger.log('=== Migrations completed successfully');
        } else {
          this.logger.log('=== Database is up to date (no pending migrations)');
        }
      } else {
        // Database has tables but no migration files or history - just sync
        this.logger.log('=== Database has schema but no migration files. Schema is already in sync.');
      }
    } catch (error) {
      this.logger.error('!!! Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if database has any tables
   */
  private async checkDatabaseHasTables(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name != '_prisma_migrations';
      `;
      return Number(result[0]?.count ?? 0) > 0;
    } catch (error) {
      // If query fails, assume no tables
      return false;
    }
  }

  /**
   * Check if migration files exist in prisma/migrations directory
   */
  private async checkMigrationFilesExist(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');

      try {
        const entries = await fs.readdir(migrationsPath, { withFileTypes: true });
        // Check if there are any migration directories (format: YYYYMMDDHHMMSS_name)
        const hasMigrations = entries.some(entry => entry.isDirectory() && /^\d/.test(entry.name));
        return hasMigrations;
      } catch (fsError: any) {
        // Directory doesn't exist or can't be read
        if (fsError.code === 'ENOENT') {
          return false;
        }
        throw fsError;
      }
    } catch (error) {
      this.logger.warn('!!! Could not check migration files:', error);
      return false;
    }
  }

  /**
   * Check if _prisma_migrations table exists
   */
  private async checkMigrationsTableExists(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_prisma_migrations'
        ) as exists;
      `;
      return result[0]?.exists ?? false;
    } catch (error) {
      // If query fails, database might not be accessible or tables don't exist
      this.logger.warn('!!! Could not check migrations table (database might not be initialized):', error);
      return false;
    }
  }

  /**
   * Check if there are pending migrations
   */
  private async checkPendingMigrations(): Promise<boolean> {
    try {
      // Get applied migrations from database
      const appliedMigrations = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL;
      `;

      const appliedNames = new Set(
        appliedMigrations.map((m) => m.migration_name)
      );

      // Try to get migration files using a cross-platform approach
      let migrationDirs: string[] = [];
      try {
        // Use find command (works on Unix) or dir command (Windows)
        const isWindows = process.platform === 'win32';
        const command = isWindows
          ? 'dir /b /ad prisma\\migrations 2>nul | findstr /R "^[0-9]"'
          : 'find prisma/migrations -maxdepth 1 -type d -name "[0-9]*" -exec basename {} \\; | sort';

        const { stdout } = await execAsync(command);
        migrationDirs = stdout.trim().split('\n').filter(Boolean);
      } catch (error) {
        // Fallback: try to read migration directory using fs
        const fs = await import('fs/promises');
        const path = await import('path');
        try {
          const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
          const entries = await fs.readdir(migrationsPath, { withFileTypes: true });
          migrationDirs = entries
            .filter(entry => entry.isDirectory() && /^\d/.test(entry.name))
            .map(entry => entry.name)
            .sort();
        } catch (fsError) {
          this.logger.warn('!!! Could not read migration directory:', fsError);
          // If we can't check, assume no pending migrations to avoid unnecessary runs
          return false;
        }
      }

      if (migrationDirs.length === 0) {
        return false;
      }

      // Check if all migrations are applied
      // Migration directory format: YYYYMMDDHHMMSS_migration_name
      const allApplied = migrationDirs.every((dir) => {
        // Extract migration name (everything after the timestamp and underscore)
        const parts = dir.split('_');
        if (parts.length < 2) return false;
        const migrationName = parts.slice(1).join('_');
        return appliedNames.has(migrationName);
      });

      return !allApplied;
    } catch (error) {
      this.logger.warn('!!! Could not check pending migrations:', error);
      // If we can't check, assume no pending migrations to avoid unnecessary runs
      return false;
    }
  }

  /**
   * Check if seed data exists and seed if needed (partial seeding support)
   */
  private async seedIfNeeded(): Promise<void> {
    try {
      this.logger.log('=== Checking seed data status...');

      // Check each data type separately
      const hasUsers = await this.checkUsersExist();
      const hasProjects = await this.checkProjectsExist();
      const hasUnits = await this.checkUnitsExist();
      const hasShortlists = await this.checkShortlistsExist();
      const hasStatistics = await this.checkStatisticsExist();
      const hasUserManipulation = await this.checkUserManipulationExist();

      // If everything exists, skip seeding
      if (hasUsers && hasProjects && hasUnits && hasShortlists && hasStatistics && hasUserManipulation) {
        this.logger.log('=== All seed data already exists. Skipping seeding.');
        return;
      }

      // Log what needs to be seeded
      const needsSeeding: string[] = [];
      if (!hasUsers) needsSeeding.push('users');
      if (!hasProjects) needsSeeding.push('projects');
      if (!hasUnits) needsSeeding.push('units');
      if (!hasShortlists) needsSeeding.push('shortlists');
      if (!hasStatistics) needsSeeding.push('statistics');
      if (!hasUserManipulation) needsSeeding.push('user_manipulation');

      this.logger.log(`=== Missing seed data: ${needsSeeding.join(', ')}. Starting partial seeding...`);
      await this.runSeeding(hasUsers, hasProjects, hasUnits, hasShortlists, hasStatistics, hasUserManipulation);
      // this.logger.log('=== Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('!!! Seeding failed:', error);
      throw error;
    }
  }

  /**
   * Check if users exist
   */
  private async checkUsersExist(): Promise<boolean> {
    try {
      const userCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM "user" WHERE "isDeleted" = false;
      `;
      const count = Number(userCount[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} users`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check users:', error);
      return false;
    }
  }

  /**
   * Check if projects exist
   */
  private async checkProjectsExist(): Promise<boolean> {
    try {
      const projectCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM project WHERE "isDeleted" = false;
      `;
      const count = Number(projectCount[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} projects`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check projects:', error);
      return false;
    }
  }

  /**
   * Check if units exist
   */
  private async checkUnitsExist(): Promise<boolean> {
    try {
      const unitCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM unit WHERE "isDeleted" = false;
      `;
      const count = Number(unitCount[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} units`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check units:', error);
      return false;
    }
  }

  /**
   * Check if shortlists exist
   */
  private async checkShortlistsExist(): Promise<boolean> {
    try {
      const shortlistCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM shortlist WHERE "isDeleted" = false;
      `;
      const count = Number(shortlistCount[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} shortlists`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check shortlists:', error);
      return false;
    }
  }

  /**
   * Check if statistics (activity logs) exist
   */
  private async checkStatisticsExist(): Promise<boolean> {
    try {
      const statsCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM activity_log;
      `;
      const count = Number(statsCount[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} activity logs`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check statistics:', error);
      return false;
    }
  }

  /**
   * Check if user_manipulation records exist
   */
  private async checkUserManipulationExist(): Promise<boolean> {
    try {
      const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count FROM user_manipulation;
      `;
      const count = Number(countResult[0]?.count ?? 0);
      if (count > 0) {
        this.logger.log(`=== Found ${count} user_manipulation records`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn('!!! Could not check user_manipulation:', error);
      return false;
    }
  }

  /**
   * Run the seeding process (with partial seeding support)
   */
  private async runSeeding(
    hasUsers: boolean,
    hasProjects: boolean,
    hasUnits: boolean,
    hasShortlists: boolean,
    hasStatistics: boolean,
    hasUserManipulation: boolean,
  ): Promise<void> {
    // Use a raw PrismaClient instance for seeding to avoid soft delete filters
    const prismaClient = new PrismaClient();

    try {
      let users: any[] = [];
      let projects: any[] = [];
      let units: any[] = [];

      // Seed users if needed
      if (!hasUsers) {
        this.logger.log('  ... Seeding users...');
        users = await seedUsers(prismaClient);
      } else {
        this.logger.log('  ... Users already exist, skipping...');
        // Fetch existing users for dependencies
        users = await prismaClient.user.findMany({ where: { isDeleted: false } });
      }

      // Seed projects if needed
      if (!hasProjects) {
        this.logger.log('  ... Seeding projects...');
        projects = await seedProjects(prismaClient);
      } else {
        this.logger.log('  ... Projects already exist, skipping...');
        // Fetch existing projects for dependencies
        projects = await prismaClient.project.findMany({ where: { isDeleted: false } });
      }

      // Seed units if needed (depends on projects)
      if (!hasUnits) {
        this.logger.log('  ... Seeding units...');
        units = await seedUnits(prismaClient, projects);
      } else {
        this.logger.log('  ... Units already exist, skipping...');
        // Fetch existing units for dependencies
        units = await prismaClient.unit.findMany({ where: { isDeleted: false } });
      }

      // Seed shortlists if needed (depends on users and units)
      if (!hasShortlists) {
        this.logger.log('  ... Seeding shortlists...');
        await seedShortlists(prismaClient, users, units);
      } else {
        this.logger.log('  ... Shortlists already exist, skipping...');
      }

      // Seed reservations if needed (depends on users, units, projects)
      // Currently commented out, but can be enabled if needed
      // if (!hasReservations) {
      //   this.logger.log('  ... Seeding reservations...');
      //   await seedReservations(prismaClient, users, units, projects);
      // }

      // Seed statistics if needed (depends on users)
      if (!hasStatistics) {
        this.logger.log('  ... Seeding statistics...');
        await seedStatistics(prismaClient, users);
      } else {
        this.logger.log('  ... Statistics already exist, skipping...');
      }

      // Seed user manipulation (FOMO) if needed
      if (!hasUserManipulation) {
        this.logger.log('  ... Seeding user_manipulation...');
        await seedUserManipulation(prismaClient);
      } else {
        this.logger.log('  ... user_manipulation already exists, skipping...');
      }

      // this.logger.log('=== All required seed data created successfully');
    } finally {
      await prismaClient.$disconnect();
    }
  }
}

