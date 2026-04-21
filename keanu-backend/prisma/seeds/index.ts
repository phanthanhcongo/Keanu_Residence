import { PrismaClient } from '@prisma/client';
import { seedProjects } from './projects.seed';
import { seedReservations } from './reservations.seed';
import { seedShortlists } from './shortlists.seed';
import { seedUnits } from './units.seed';
import { seedUsers } from './users.seed';
import { seedStatistics } from './statistics.seed';
import { seedUserManipulation } from './user-manipulation.seed';


const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SEEDING DENIED: Database seeding is not allowed in production environment.');
    process.exit(1);
  }
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data using TRUNCATE CASCADE for thorough cleanup
    console.log('🧹 Cleaning existing data...');
    // EXTRA SAFETY: Double check NODE_ENV before truncating
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: Attempted to truncate tables in production!');
    }
    await prisma.$executeRawUnsafe('TRUNCATE TABLE reservation, shortlist, unit, project, activity_log, email_otp, phone_otp, user_manipulation, "user" CASCADE;');

    // Seed data in correct order
    console.log('======Seeding users========');
    const users = await seedUsers(prisma);

    console.log('=====Seeding projects========');
    const projects = await seedProjects(prisma);

    console.log('=====Seeding units========');
    const units = await seedUnits(prisma, projects);

    console.log('=====Seeding shortlists========');
    await seedShortlists(prisma, users, units);

    console.log('=====Seeding reservations========');
    //await seedReservations(prisma, users, units, projects);

    console.log('📊 Seeding statistics data...');
    await seedStatistics(prisma, users);

    console.log('=====Seeding user manipulation (FOMO)========');
    await seedUserManipulation(prisma);

    console.log(' Database seeding completed successfully!');
  } catch (error) {
    console.error(' Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();