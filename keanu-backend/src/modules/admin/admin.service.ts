import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectGateway } from '../projects/project.gateway';
import { ReservationsGateway } from '../reservations/reservations.gateway';
import { ListUsersDto, UpdateUserRoleDto, UpdateUserStatusDto, CreateUserDto } from './dto/users.dto';
import { CreateProjectDto, UpdateProjectDto, ListProjectsDto } from './dto/projects.dto';
import { CreateUnitDto, UpdateUnitDto, ListUnitsDto } from './dto/units.dto';
import { ListReservationsDto, UpdateReservationStatusDto, UpdatePaymentStatusDto } from './dto/reservations.dto';
import { ListActivityLogsDto } from './dto/activity-logs.dto';
import { UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ProjectStatus } from '../projects/entities/project.entity';
import { UserManipulationService } from './user-manipulation.service';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

@Injectable()
export class AdminService {
  // Static online user tracking
  private static userCount = 0;
  private static onlineUsers = new Map<string, Date>(); // userId -> lastActivityTime
  private static inactivityCheckInterval: NodeJS.Timeout | null = null;
  private static readonly INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => ProjectGateway))
    private readonly projectGateway: ProjectGateway,
    @Inject(forwardRef(() => ReservationsGateway))
    private readonly reservationsGateway: ReservationsGateway,
    private readonly userManipulationService: UserManipulationService,
  ) {
    // Start the inactivity check interval if not already started
    if (!AdminService.inactivityCheckInterval) {
      AdminService.startInactivityCheck();
    }
  }

  // ============================================================================
  // ONLINE USER TRACKING
  // ============================================================================

  /**
   * Mark user as online when they login
   */
  static markUserOnline(userId: string): void {
    if (!AdminService.onlineUsers.has(userId)) {
      AdminService.userCount++;
      AdminService.onlineUsers.set(userId, new Date());
      const stack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
      console.log(`[Online Tracking] User ${userId} marked online. Count: ${AdminService.userCount} | Called from: ${stack}`);
    } else {
      // Update last activity time if already online
      AdminService.onlineUsers.set(userId, new Date());
      const stack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
      console.log(`[Online Tracking] User ${userId} already online, updated activity time. Count: ${AdminService.userCount} | Called from: ${stack}`);
    }
  }

  /**
   * Update user activity when they interact with the web
   */
  static updateUserActivity(userId: string): void {
    if (AdminService.onlineUsers.has(userId)) {
      // User is already online, just update their last activity time
      AdminService.onlineUsers.set(userId, new Date());
      // console.log(`[Online Tracking] User ${userId} activity updated. Count: ${AdminService.userCount}`);
    } else {
      // User was offline, mark them as online
      AdminService.userCount++;
      AdminService.onlineUsers.set(userId, new Date());
      console.log(`[Online Tracking] User ${userId} came online via activity. Count: ${AdminService.userCount}`);
    }
  }

  /**
   * Mark user as offline when they logout
   */
  static markUserOffline(userId: string): void {
    if (AdminService.onlineUsers.has(userId)) {
      AdminService.onlineUsers.delete(userId);
      AdminService.userCount = Math.max(0, AdminService.userCount - 1);
      console.log(`[Online Tracking] User ${userId} marked offline. Count: ${AdminService.userCount}`);
    } else {
      console.log(`[Online Tracking] User ${userId} not found in online users (already offline?). Count: ${AdminService.userCount}`);
    }
  }

  /**
   * Check for inactive users and remove them from online count
   */
  private static checkInactiveUsers(): void {
    const now = new Date();
    const usersToRemove: string[] = [];

    AdminService.onlineUsers.forEach((lastActivity, userId) => {
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      if (timeSinceLastActivity >= AdminService.INACTIVITY_TIMEOUT) {
        usersToRemove.push(userId);
      }
    });

    // Remove inactive users
    usersToRemove.forEach(userId => {
      AdminService.onlineUsers.delete(userId);
      AdminService.userCount = Math.max(0, AdminService.userCount - 1);
    });
  }

  /**
   * Start the interval to check for inactive users every minute
   */
  private static startInactivityCheck(): void {
    // Check every minute for inactive users
    AdminService.inactivityCheckInterval = setInterval(() => {
      AdminService.checkInactiveUsers();
    }, 60 * 1000); // Check every minute

    // Also check immediately
    AdminService.checkInactiveUsers();
  }

  /**
   * Get current online user count
   */
  static getOnlineUserCount(): number {
    // Clean up inactive users before returning count
    AdminService.checkInactiveUsers();
    // Sync count with actual Map size to fix any inconsistencies
    AdminService.syncUserCount();
    return AdminService.userCount;
  }

  /**
   * Get online user count (instance method for dependency injection)
   */
  getOnlineUserCount(): number {
    return AdminService.getOnlineUserCount();
  }

  /**
   * Get manipulated user count (Real + Delta)
   */
  async getManipulatedUserCount(): Promise<number> {
    const realCount = AdminService.getOnlineUserCount();
    const delta = await this.userManipulationService.getCurrentDelta();
    const totalCount = realCount + delta;

    // Log for debugging
    if (realCount > 0 || delta > 0) {
      console.log(`[User Count] Real: ${realCount}, Delta: ${delta}, Total: ${totalCount}`);
    }

    return totalCount;
  }

  /**
   * Get breakdown for API/debug purposes
   */
  async getUserCountBreakdown() {
    const realCount = AdminService.getOnlineUserCount();
    const delta = await this.userManipulationService.getCurrentDelta();
    return {
      realCount,
      delta,
      totalCount: realCount + delta,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // FOMO EFFECT (User Manipulation)
  // ============================================================================

  /**
   * Trigger FOMO effect — generates manipulation rows starting 10 min before launch.
   * Only works if the primary project's launch is ≤ 10 minutes away.
   */
  async triggerFomo() {
    // Find primary project
    const project = await this.prisma.project.findFirst({
      where: { isPrimary: true, isDeleted: false },
    });

    if (!project) {
      throw new BadRequestException('No primary project found.');
    }

    if (!project.launchDate || !project.launchTime) {
      throw new BadRequestException('Primary project has no launch date/time configured.');
    }

    // Calculate launch datetime in UTC
    const datePart = project.launchDate.toISOString().split('T')[0];
    const combined = `${datePart} ${project.launchTime}`;
    let tz = project.timezone?.toString() || 'UTC';
    if (tz.startsWith('UTC')) tz = tz.replace(/^UTC/, '') || 'UTC';

    let launchDateUtc: Date;
    try {
      launchDateUtc = zonedTimeToUtc(combined, tz);
    } catch {
      throw new BadRequestException('Failed to parse project launch datetime.');
    }

    const now = Date.now();
    const timeUntilLaunch = launchDateUtc.getTime() - now;
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    if (timeUntilLaunch > TEN_MINUTES_MS) {
      const minutesAway = Math.ceil(timeUntilLaunch / 60000);
      throw new BadRequestException(
        `Launch is ${minutesAway} minutes away. FOMO can only be triggered within 10 minutes of launch.`
      );
    }

    // Determine start time: max(now, launchTime - 10min)
    const idealStart = launchDateUtc.getTime() - TEN_MINUTES_MS;
    const startTime = Math.max(idealStart, now);

    // Generate records from startTime up to 10 minutes after launch
    const endTime = launchDateUtc.getTime() + TEN_MINUTES_MS;
    const intervalMs = 2000;
    const totalRecords = Math.ceil((endTime - startTime) / intervalMs);

    const records: { delta: number; milestone: Date }[] = [];
    for (let i = 0; i < totalRecords; i++) {
      const milestone = new Date(startTime + i * intervalMs);
      const progress = i / totalRecords; // 0 → 1
      const baseMin = 20 + Math.floor(progress * 25); // 20 → 45
      const baseMax = 30 + Math.floor(progress * 30); // 30 → 60
      const delta = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
      records.push({ delta, milestone });
    }

    // Replace existing data
    await this.prisma.userManipulation.deleteMany({});
    await this.prisma.userManipulation.createMany({ data: records });

    return {
      success: true,
      message: `FOMO effect triggered. ${records.length} manipulation records generated.`,
      recordsCreated: records.length,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      launchTime: launchDateUtc.toISOString(),
    };
  }

  /**
   * Stop FOMO effect — clears all manipulation rows immediately.
   */
  async stopFomo() {
    const result = await this.prisma.userManipulation.deleteMany({});
    return {
      success: true,
      message: `FOMO effect stopped. ${result.count} records removed.`,
      recordsRemoved: result.count,
    };
  }

  /**
   * Get FOMO status — check if manipulation is active and return info.
   */
  async getFomoStatus() {
    const count = await this.prisma.userManipulation.count();
    const currentDelta = await this.userManipulationService.getCurrentDelta();

    // Get time range if rows exist
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    if (count > 0) {
      const first = await this.prisma.userManipulation.findFirst({ orderBy: { milestone: 'asc' } });
      const last = await this.prisma.userManipulation.findFirst({ orderBy: { milestone: 'desc' } });
      startTime = first?.milestone || null;
      endTime = last?.milestone || null;
    }

    return {
      active: count > 0 && currentDelta > 0,
      totalRecords: count,
      currentDelta,
      startTime: startTime?.toISOString() || null,
      endTime: endTime?.toISOString() || null,
    };
  }

  /**
   * Get debug info about online users (for debugging)
   */
  static getOnlineUsersDebugInfo(): { count: number; users: Array<{ userId: string; lastActivity: Date }> } {
    const users = Array.from(AdminService.onlineUsers.entries()).map(([userId, lastActivity]) => ({
      userId,
      lastActivity,
    }));
    return {
      count: AdminService.userCount,
      users,
    };
  }

  /**
   * Reset online user tracking (for testing/debugging)
   * WARNING: Only use for testing!
   */
  static resetOnlineUsers(): void {
    AdminService.userCount = 0;
    AdminService.onlineUsers.clear();
    console.log('[Online Tracking] Reset online users tracking. Count: 0');
  }

  /**
   * Sync userCount with actual onlineUsers Map size (fix inconsistencies)
   */
  static syncUserCount(): void {
    const actualCount = AdminService.onlineUsers.size;
    if (AdminService.userCount !== actualCount) {
      console.warn(`[Online Tracking] Count mismatch detected! userCount=${AdminService.userCount}, actual=${actualCount}. Syncing...`);
      AdminService.userCount = actualCount;
    }
  }

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  async createUser(dto: CreateUserDto) {
    const { email, firstName, lastName, password, role, isVerified } = dto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber: dto.email }], // Checking email since it's the unique identifier
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        isVerified: isVerified ?? false,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  async listUsers(dto: ListUsersDto) {
    const { search, role, isVerified, page = 1, limit = 20, includeDeleted = false } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    } else {
      // Exclude SUPER_ADMIN from the list by default
      where.role = { not: 'SUPER_ADMIN' as any };
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // Control soft-delete filter: pass explicit value so PrismaService middleware doesn't override it
    const andList = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    if (includeDeleted) {
      where.AND = [
        ...andList,
        { OR: [{ isDeleted: true }, { isDeleted: false }] }, // always-true for boolean
      ];
    } else {
      where.isDeleted = false;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isVerified: true,
          isDeleted: true as any,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              reservations: true,
              shortlists: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reservations: true,
            shortlists: true,
            emailOtps: true,
            phoneOtps: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, adminUserId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent modifying ADMIN or SUPER_ADMIN users
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify ADMIN or SUPER_ADMIN users');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role as unknown as UserRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log activity
    if (adminUserId) {
      await this.activityLogService.createActivityLog({
        userId: adminUserId,
        action: 'USER_ROLE_UPDATE',
        entity: 'User',
        entityId: userId,
        metadata: { targetUserEmail: user.email, oldRole: user.role, newRole: dto.role },
        ipAddress,
        userAgent,
      });
    }

    return updated;
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto, adminUserId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent modifying ADMIN or SUPER_ADMIN users
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify ADMIN or SUPER_ADMIN users');
    }

    const updateData: any = {};
    if (dto.isVerified !== undefined) {
      updateData.isVerified = dto.isVerified;
    }

    if (dto.status) {
      updateData.status = dto.status;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        status: true,
        updatedAt: true,
      },
    });

    // Log activity
    if (adminUserId) {
      await this.activityLogService.createActivityLog({
        userId: adminUserId,
        action: 'USER_STATUS_UPDATE',
        entity: 'User',
        entityId: userId,
        metadata: { targetUserEmail: user.email, oldStatus: { isVerified: user.isVerified }, newStatus: dto },
        ipAddress,
        userAgent,
      });
    }

    return updated;
  }

  async deleteUser(userId: string, adminUserId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            reservations: true,
            shortlists: true,
            emailOtps: true,
            phoneOtps: true,
            activityLogs: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting ADMIN or SUPER_ADMIN users
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete ADMIN or SUPER_ADMIN users');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // 1. Get all reservations for this user (including deleted ones for soft delete)
      const reservations = await tx.reservation.findMany({
        where: {
          userId,
          isDeleted: false as any, // Only get non-deleted reservations
        },
        select: { id: true, unitId: true, status: true },
      });

      // 2. Soft delete all reservations
      if (reservations.length > 0) {
        // Unlock units that are locked by these reservations
        const unitIdsToUnlock = reservations
          .filter((r) => r.status === 'PENDING' || r.status === 'CONFIRMED')
          .map((r) => r.unitId);

        if (unitIdsToUnlock.length > 0) {
          // Update units back to AVAILABLE if they were locked/reserved
          await tx.unit.updateMany({
            where: {
              id: { in: unitIdsToUnlock },
              status: { in: ['LOCKED', 'RESERVED'] },
              isDeleted: false as any,
            },
            data: { status: 'AVAILABLE' },
          });
        }

        // Soft delete all reservations
        await tx.reservation.updateMany({
          where: { userId, isDeleted: false as any },
          data: { isDeleted: true as any },
        });
      }

      // 3. Soft delete user and related data
      // Soft delete shortlists
      await tx.shortlist.updateMany({
        where: { userId, isDeleted: false as any },
        data: { isDeleted: true as any },
      });

      // Soft delete emailOtps
      await tx.emailOtp.updateMany({
        where: { userId, isDeleted: false as any },
        data: { isDeleted: true as any },
      });

      // Soft delete phoneOtps
      await tx.phoneOtp.updateMany({
        where: { userId, isDeleted: false as any },
        data: { isDeleted: true as any },
      });

      // Soft delete activityLogs
      await tx.activityLog.updateMany({
        where: { userId, isDeleted: false as any },
        data: { isDeleted: true as any },
      });

      // Delete refresh token
      await tx.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      });

      // Soft delete user
      await tx.user.update({
        where: { id: userId },
        data: { isDeleted: true as any, status: 'INACTIVE' },
      });
    });

    // Log activity
    if (adminUserId) {
      await this.activityLogService.createActivityLog({
        userId: adminUserId,
        action: 'USER_DELETE',
        entity: 'User',
        entityId: userId,
        metadata: { targetUserEmail: user.email, targetUserRole: user.role },
        ipAddress,
        userAgent,
      });
    }

    return { message: 'User marked as deleted successfully' };
  }

  async restoreUser(userId: string, adminUserId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDeleted) {
      throw new BadRequestException('User is not deleted');
    }

    // Restore user
    await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: false as any, status: 'ACTIVE' },
    });

    // Log activity
    if (adminUserId) {
      await this.activityLogService.createActivityLog({
        userId: adminUserId,
        action: 'USER_RESTORE',
        entity: 'User',
        entityId: userId,
        metadata: { targetUserEmail: user.email },
        ipAddress,
        userAgent,
      });
    }

    return { message: 'User restored successfully' };
  }

  // ============================================================================
  // PROJECTS MANAGEMENT
  // ============================================================================

  async listProjects(dto: ListProjectsDto) {
    const { search, status, page = 1, limit = 20, includeDeleted = false } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Control soft-delete filter: pass explicit value so PrismaService middleware doesn't override it
    // Using { in: [true, false] } when includeDeleted=true allows the middleware to see a non-undefined value
    const andList = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    if (includeDeleted) {
      where.AND = [
        ...andList,
        { OR: [{ isDeleted: true }, { isDeleted: false }] }, // always-true for boolean
      ];
    } else {
      where.isDeleted = false;
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              units: true,
              reservations: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects.map(p => ({
        ...p,
        depositAmount: Number(p.depositAmount),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectDetail(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            units: true,
            reservations: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      ...project,
      depositAmount: Number(project.depositAmount),
    };
  }

  async createProject(dto: CreateProjectDto, userId?: string, ipAddress?: string, userAgent?: string) {
    // Check if slug already exists
    const existing = await this.prisma.project.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Project with this slug already exists');
    }

    // Check if status is LIVE, ensure no other project is LIVE
    if (dto.status === ProjectStatus.LIVE) {
      const liveProject = await this.prisma.project.findFirst({
        where: { status: ProjectStatus.LIVE, isDeleted: false },
      });

      if (liveProject) {
        throw new BadRequestException('Another project is already LIVE. Only one project can be LIVE at a time.');
      }
    }

    // Check if trying to set isPrimary=true when another project already has it
    if (dto.isPrimary) {
      const primaryProject = await this.prisma.project.findFirst({
        where: { isPrimary: true, isDeleted: false },
        select: { id: true, name: true, slug: true },
      });

      if (primaryProject) {
        throw new BadRequestException(
          `Another project "${primaryProject.name}" (${primaryProject.slug}) is already set as primary. Please unset it first before setting this project as primary.`
        );
      }
    }

    // Extract only the fields we need, excluding any id field
    const { ...projectData } = dto;

    // Use transaction to ensure data consistency
    const project: any = await this.prisma.$transaction(async (tx) => {

      const newProject = await tx.project.create({
        data: {
          name: projectData.name,
          slug: projectData.slug,
          description: projectData.description,
          developer: projectData.developer,
          location: projectData.location,
          launchDate: new Date(projectData.launchDate),
          launchTime: projectData.launchTime,
          timezone: projectData.timezone || 'UTC',
          status: projectData.status,
          logoUrl: projectData.logoUrl,
          primaryColor: projectData.primaryColor,
          secondaryColor: projectData.secondaryColor,
          heroImageUrl: projectData.heroImageUrl,
          videoUrl: projectData.videoUrl,
          termsUrl: projectData.termsUrl,
          policyUrl: projectData.policyUrl,
          reservationDuration: projectData.reservationDuration || 10,
          depositAmount: projectData.depositAmount,
          isPrimary: projectData.isPrimary || false,
          // ID will be auto-generated by Prisma
        },
      });
      return newProject;
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'PROJECT_CREATE',
        entity: 'Project',
        entityId: project.id,
        metadata: { name: project.name, slug: project.slug },
        ipAddress,
        userAgent,
      });
    }

    return {
      ...project,
      depositAmount: Number(project.depositAmount),
    };
  }

  async updateProject(projectId: string, dto: UpdateProjectDto, userId?: string, ipAddress?: string, userAgent?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check slug uniqueness if being updated
    if (dto.slug && dto.slug !== project.slug) {
      const existing = await this.prisma.project.findUnique({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException('Project with this slug already exists');
      }
    }

    // Helper function to calculate launch datetime in UTC
    const calculateLaunchDatetime = (launchDate: Date, launchTime: string, timezone: string): Date | null => {
      try {
        const datePart = launchDate.toISOString().split('T')[0];
        const combined = `${datePart} ${launchTime}`;
        let tz = timezone?.toString() || 'UTC';
        if (tz.startsWith('UTC')) tz = tz.replace(/^UTC/, '') || 'UTC';
        return zonedTimeToUtc(combined, tz);
      } catch (error) {
        return null;
      }
    };

    // Validate: If status is being set to UPCOMING, launchDate and launchTime must be provided
    if (dto.status === ProjectStatus.UPCOMING) {
      const finalLaunchDate = dto.launchDate ? new Date(dto.launchDate) : project.launchDate;
      const finalLaunchTime = dto.launchTime || project.launchTime;

      if (!finalLaunchDate || !finalLaunchTime) {
        throw new BadRequestException('Launch date and launch time are required when setting project status to UPCOMING');
      }
    }

    // Check if launchDate, launchTime, or timezone are being updated
    const launchDateChanged = dto.launchDate && new Date(dto.launchDate).getTime() !== new Date(project.launchDate).getTime();
    const launchTimeChanged = dto.launchTime && dto.launchTime !== project.launchTime;
    const timezoneChanged = dto.timezone && dto.timezone !== project.timezone;
    const shouldReschedule = launchDateChanged || launchTimeChanged || timezoneChanged;

    // Check if status is being changed
    const statusChangedToUpcoming = dto.status === 'UPCOMING' && project.status !== 'UPCOMING';
    const statusChangedToLive = dto.status === 'LIVE' && project.status !== 'LIVE';
    const statusChangedToClosed = dto.status === 'CLOSED' && project.status !== 'CLOSED';

    // Note: Users can close project regardless of reservations status

    // If changing to LIVE, check if any other project is LIVE
    if (statusChangedToLive) {
      const liveProject = await this.prisma.project.findFirst({
        where: {
          status: ProjectStatus.LIVE,
          isDeleted: false,
          id: { not: projectId }
        },
      });

      if (liveProject) {
        throw new BadRequestException('Another project is already LIVE. Only one project can be LIVE at a time.');
      }
    }

    // Check if trying to set isPrimary=true when another project already has it
    if (dto.isPrimary !== undefined && dto.isPrimary === true) {
      const primaryProject = await this.prisma.project.findFirst({
        where: {
          isPrimary: true,
          isDeleted: false,
          id: { not: projectId },
        },
        select: { id: true, name: true, slug: true },
      });

      if (primaryProject) {
        throw new BadRequestException(
          `Another project "${primaryProject.name}" (${primaryProject.slug}) is already set as primary. Please unset it first before setting this project as primary.`
        );
      }
    }

    const updateData: any = { ...dto };
    if (dto.launchDate) {
      updateData.launchDate = new Date(dto.launchDate);
    }
    if (dto.depositAmount !== undefined) {
      updateData.depositAmount = dto.depositAmount;
    }

    // Auto-set status to UPCOMING when launch date/time is updated to a future datetime,
    // unless the admin is explicitly setting LIVE or CLOSED.
    if (shouldReschedule && dto.status !== 'LIVE' && dto.status !== 'CLOSED' && project.status !== 'LIVE') {
      const finalLaunchDate = updateData.launchDate || project.launchDate;
      const finalLaunchTime = dto.launchTime || project.launchTime;
      const finalTimezone = dto.timezone || project.timezone;
      const futureDatetime = calculateLaunchDatetime(finalLaunchDate, finalLaunchTime, finalTimezone);

      if (futureDatetime && futureDatetime.getTime() > Date.now()) {
        // Launch is in the future — force UPCOMING
        updateData.status = 'UPCOMING';
      }
    }

    // Re-evaluate status flags after potential auto-override
    const finalStatus = updateData.status || project.status;

    // Use transaction to ensure consistency when updating project and units
    let unitsUpdatedCount = 0;
    const updated = await this.prisma.$transaction(async (tx) => {

      // Update project
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: updateData,
      });

      // If status changed to UPCOMING (explicitly or auto-detected), set AVAILABLE units to UNAVAILABLE
      if (finalStatus === 'UPCOMING' && project.status !== 'UPCOMING') {
        const updateResult = await tx.unit.updateMany({
          where: {
            projectId: projectId,
            status: 'AVAILABLE',
            isDeleted: false as any,
          },
          data: {
            status: 'UNAVAILABLE',
            updatedAt: new Date(),
          },
        });
        unitsUpdatedCount = updateResult.count;
      }

      // If status changed to LIVE, update all UNAVAILABLE units to AVAILABLE
      if (finalStatus === 'LIVE' && project.status !== 'LIVE') {
        const updateResult = await tx.unit.updateMany({
          where: {
            projectId: projectId,
            status: 'UNAVAILABLE',
            isDeleted: false as any,
          },
          data: {
            status: 'AVAILABLE',
            updatedAt: new Date(),
          },
        });
        unitsUpdatedCount = updateResult.count;
      }

      // If status changed to CLOSED, update ONLY AVAILABLE units to UNAVAILABLE.
      // Other statuses (LOCKED, RESERVED, SOLD, UNAVAILABLE, etc.) remain unchanged.
      if (finalStatus === 'CLOSED' && project.status !== 'CLOSED') {
        const updateResult = await tx.unit.updateMany({
          where: {
            projectId: projectId,
            status: 'AVAILABLE',
            isDeleted: false as any,
          },
          data: {
            status: 'UNAVAILABLE',
            updatedAt: new Date(),
          },
        });
        unitsUpdatedCount = updateResult.count;
      }

      return updatedProject;
    });

    // Re-schedule launch job if launchDate, launchTime, or timezone changed
    if (shouldReschedule) {
      try {
        await this.projectsService.scheduleLaunchJob(
          projectId,
          updated.launchDate,
          updated.launchTime || project.launchTime,
          updated.timezone || project.timezone,
        );
      } catch (error) {
        // Log error but don't fail the update
        console.error('Failed to re-schedule launch job:', error);
      }
    }

    // Emit WebSocket events for frontend real-time updates
    if (finalStatus === 'LIVE' && project.status !== 'LIVE') {
      try {
        this.projectGateway.emitProjectLive(projectId);
        this.reservationsGateway.emitProjectLive(projectId);
      } catch (error) {
        console.error('Failed to emit project:live event:', error);
      }
    }

    if (finalStatus === 'UPCOMING' && project.status !== 'UPCOMING') {
      try {
        this.reservationsGateway.emitProjectStatusChanged(projectId, 'UPCOMING');
      } catch (error) {
        console.error('Failed to emit project:status-changed event:', error);
      }
    }

    if (finalStatus === 'CLOSED' && project.status !== 'CLOSED') {
      try {
        this.reservationsGateway.emitProjectStatusChanged(projectId, 'CLOSED');
      } catch (error) {
        console.error('Failed to emit project:status-changed event:', error);
      }
    }

    // Log activity
    if (userId) {
      const metadata: any = {
        updatedFields: Object.keys(dto),
        rescheduledJob: shouldReschedule,
      };

      // Add unit status change info if status changed
      if (finalStatus === 'UPCOMING' && project.status !== 'UPCOMING') {
        metadata.unitsChangedToUnavailable = unitsUpdatedCount;
        metadata.statusChangedToUpcoming = true;
        if (updateData.status === 'UPCOMING' && !dto.status) {
          metadata.autoStatusUpcoming = true; // set automatically due to future date
        }
      }

      if (finalStatus === 'LIVE' && project.status !== 'LIVE') {
        metadata.unitsChangedToAvailable = unitsUpdatedCount;
        metadata.statusChangedToLive = true;
      }

      if (finalStatus === 'CLOSED' && project.status !== 'CLOSED') {
        metadata.unitsChangedToUnavailable = unitsUpdatedCount;
        metadata.statusChangedToClosed = true;
      }

      await this.activityLogService.createActivityLog({
        userId,
        action: 'PROJECT_UPDATE',
        entity: 'Project',
        entityId: projectId,
        metadata,
        ipAddress,
        userAgent,
      });
    }

    return {
      ...updated,
      depositAmount: Number(updated.depositAmount),
    };
  }

  async deleteProject(projectId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.isDeleted) {
      throw new BadRequestException('Project is already deleted');
    }

    // Prevent deletion of LIVE projects
    if (project.status === ProjectStatus.LIVE) {
      throw new BadRequestException('Cannot delete project with LIVE status.');
    }

    try {
      // Use transaction to ensure data consistency
      await this.prisma.$transaction(async (tx) => {
        // 1. Soft delete all reservations
        await tx.reservation.updateMany({
          where: {
            projectId,
            isDeleted: false as any,
          },
          data: { isDeleted: true as any },
        });

        // 2. Get all units of this project (non-deleted)
        const units = await tx.unit.findMany({
          where: {
            projectId,
            isDeleted: false as any,
          },
          select: { id: true },
        });

        const unitIds = units.map((u) => u.id);

        if (unitIds.length > 0) {
          // 3. Soft delete all shortlists of these units
          await tx.shortlist.updateMany({
            where: {
              unitId: { in: unitIds },
              isDeleted: false as any,
            },
            data: { isDeleted: true as any },
          });

          // 4. Soft delete all units
          await tx.unit.updateMany({
            where: {
              projectId,
              isDeleted: false as any,
            },
            data: { isDeleted: true as any },
          });
        }

        // 5. Soft delete project
        await tx.project.update({
          where: { id: projectId },
          data: { isDeleted: true as any },
        });
      });

      // Log activity
      if (userId) {
        await this.activityLogService.createActivityLog({
          userId,
          action: 'PROJECT_DELETE',
          entity: 'Project',
          entityId: projectId,
          metadata: { name: project.name, slug: project.slug },
          ipAddress,
          userAgent,
        });
      }

      return { message: 'Project and all related data marked as deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete project: ${error.message}`);
    }
  }

  async restoreProject(projectId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.isDeleted) {
      throw new BadRequestException('Project is not deleted');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // 1. Restore project
      await tx.project.update({
        where: { id: projectId },
        data: { isDeleted: false as any },
      });

      // 2. Get all units of this project (deleted)
      const units = await tx.unit.findMany({
        where: {
          projectId,
          isDeleted: true as any,
        },
        select: { id: true },
      });

      const unitIds = units.map((u) => u.id);

      if (unitIds.length > 0) {
        // 3. Restore all units
        await tx.unit.updateMany({
          where: {
            projectId,
            isDeleted: true as any,
          },
          data: { isDeleted: false as any },
        });

        // 4. Restore all reservations of these units
        await tx.reservation.updateMany({
          where: {
            unitId: { in: unitIds },
            isDeleted: true as any,
          },
          data: { isDeleted: false as any },
        });

        // 5. Restore all shortlists of these units
        await tx.shortlist.updateMany({
          where: {
            unitId: { in: unitIds },
            isDeleted: true as any,
          },
          data: { isDeleted: false as any },
        });
      }

      // 6. Restore all reservations of project (to be safe)
      await tx.reservation.updateMany({
        where: {
          projectId,
          isDeleted: true as any,
        },
        data: { isDeleted: false as any },
      });
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'PROJECT_RESTORE',
        entity: 'Project',
        entityId: projectId,
        metadata: { name: project.name, slug: project.slug },
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Project and all related data restored successfully' };
  }

  // ============================================================================
  // UNITS MANAGEMENT
  // ============================================================================

  async listUnits(dto: ListUnitsDto) {
    const { projectId, status, unitType, minPrice, maxPrice, page = 1, limit = 20, includeDeleted = false } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.UnitWhereInput = {};

    // Filter by projectId if provided, otherwise show all units
    if (projectId) {
      // Validate that the project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (unitType) {
      where.unitType = unitType;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Control soft-delete filter: pass explicit value so PrismaService middleware doesn't override it
    // Using { in: [true, false] } when includeDeleted=true allows the middleware to see a non-undefined value
    const andList = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    if (includeDeleted) {
      where.AND = [
        ...andList,
        { OR: [{ isDeleted: true }, { isDeleted: false }] }, // always-true for boolean
      ];
    } else {
      where.isDeleted = false;
    }

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              reservations: true,
              shortlists: true,
            },
          },
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data: units.map(u => ({
        ...u,
        size: Number(u.size),
        bathrooms: Number(u.bathrooms),
        price: Number(u.price),
        launchPrice: u.launchPrice ? Number(u.launchPrice) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnitDetail(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        project: true,
        _count: {
          select: {
            reservations: true,
            shortlists: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      ...unit,
      size: Number(unit.size),
      bathrooms: Number(unit.bathrooms),
      price: Number(unit.price),
      launchPrice: unit.launchPrice ? Number(unit.launchPrice) : null,
      project: {
        ...unit.project,
        depositAmount: Number(unit.project.depositAmount),
      },
    };
  }

  async createUnit(dto: CreateUnitDto, userId?: string, ipAddress?: string, userAgent?: string) {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if unit number already exists in project
    const existing = await this.prisma.unit.findUnique({
      where: {
        projectId_unitNumber: {
          projectId: dto.projectId,
          unitNumber: dto.unitNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Unit number already exists in this project');
    }

    // Extract only the fields we need, excluding any id field
    const { ...unitData } = dto;

    const unit = await this.prisma.unit.create({
      data: {
        projectId: unitData.projectId,
        unitNumber: unitData.unitNumber,
        unitType: unitData.unitType,
        floor: unitData.floor,
        size: unitData.size,
        bedrooms: unitData.bedrooms,
        bathrooms: unitData.bathrooms,
        price: unitData.price,
        launchPrice: unitData.launchPrice,
        status: unitData.status,
        description: unitData.description,
        floorPlanUrl: unitData.floorPlanUrl,
        imageUrls: unitData.imageUrls ?? undefined,
        features: unitData.features ?? undefined,
        xPosition: unitData.xPosition,
        yPosition: unitData.yPosition,
        shortlistCount: unitData.shortlistCount || 0,
        // ID will be auto-generated by Prisma
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'UNIT_CREATE',
        entity: 'Unit',
        entityId: unit.id,
        metadata: { unitNumber: unit.unitNumber, projectId: unit.projectId },
        ipAddress,
        userAgent,
      });
    }

    return {
      ...unit,
      size: Number(unit.size),
      bathrooms: Number(unit.bathrooms),
      price: Number(unit.price),
      launchPrice: unit.launchPrice ? Number(unit.launchPrice) : null,
    };
  }

  async updateUnit(unitId: string, dto: UpdateUnitDto, userId?: string, ipAddress?: string, userAgent?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Determine the target projectId (new one if provided, otherwise keep current)
    const targetProjectId = dto.projectId || unit.projectId;
    const isProjectChanging = dto.projectId && dto.projectId !== unit.projectId;
    const isUnitNumberChanging = dto.unitNumber && dto.unitNumber !== unit.unitNumber;

    // If project is being changed, validate the new project exists
    if (isProjectChanging) {
      const targetProject = await this.prisma.project.findUnique({
        where: { id: targetProjectId },
      });

      if (!targetProject) {
        throw new NotFoundException('Target project not found');
      }

      if (targetProject.isDeleted) {
        throw new BadRequestException('Cannot move unit to a deleted project');
      }
    }

    // Check unit number uniqueness in the target project
    // Need to check if either projectId or unitNumber is changing
    if (isUnitNumberChanging || isProjectChanging) {
      const unitNumberToCheck = dto.unitNumber || unit.unitNumber;
      const existing = await this.prisma.unit.findUnique({
        where: {
          projectId_unitNumber: {
            projectId: targetProjectId,
            unitNumber: unitNumberToCheck,
          },
        },
      });

      // If found a unit with same projectId+unitNumber, and it's not the current unit, it's a conflict
      if (existing && existing.id !== unitId) {
        throw new ConflictException('Unit number already exists in this project');
      }
    }

    // Build updateData, including projectId if it's being changed
    const updateData: any = {};

    // Include projectId if it's being changed
    if (isProjectChanging) {
      updateData.projectId = dto.projectId;
    }

    // Include all other fields from DTO
    if (dto.unitNumber !== undefined) {
      updateData.unitNumber = dto.unitNumber;
    }
    if (dto.unitType !== undefined) {
      updateData.unitType = dto.unitType;
    }
    if (dto.floor !== undefined) {
      updateData.floor = dto.floor;
    }
    if (dto.size !== undefined) {
      updateData.size = dto.size;
    }
    if (dto.bedrooms !== undefined) {
      updateData.bedrooms = dto.bedrooms;
    }
    if (dto.bathrooms !== undefined) {
      updateData.bathrooms = dto.bathrooms;
    }
    if (dto.price !== undefined) {
      updateData.price = dto.price;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.floorPlanUrl !== undefined) {
      updateData.floorPlanUrl = dto.floorPlanUrl;
    }
    if (dto.imageUrls !== undefined) {
      updateData.imageUrls = dto.imageUrls;
    }
    if (dto.features !== undefined) {
      updateData.features = dto.features;
    }
    if (dto.xPosition !== undefined) {
      updateData.xPosition = dto.xPosition;
    }
    if (dto.yPosition !== undefined) {
      updateData.yPosition = dto.yPosition;
    }
    if (dto.shortlistCount !== undefined) {
      updateData.shortlistCount = dto.shortlistCount;
    }
    if (dto.launchPrice !== undefined) {
      updateData.launchPrice = dto.launchPrice;
    }

    const updated = await this.prisma.unit.update({
      where: { id: unitId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'UNIT_UPDATE',
        entity: 'Unit',
        entityId: unitId,
        metadata: { updatedFields: Object.keys(dto) },
        ipAddress,
        userAgent,
      });
    }

    return {
      ...updated,
      size: Number(updated.size),
      bathrooms: Number(updated.bathrooms),
      price: Number(updated.price),
      launchPrice: updated.launchPrice ? Number(updated.launchPrice) : null,
    };
  }

  async deleteUnit(unitId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // // Check for non-deleted reservations and shortlists
    // const activeReservationsCount = await this.prisma.reservation.count({
    //   where: {
    //     unitId,
    //     isDeleted: false as any,
    //   },
    // });

    // const activeShortlistsCount = await this.prisma.shortlist.count({
    //   where: {
    //     unitId,
    //     isDeleted: false as any,
    //   },
    // });

    // if (activeReservationsCount > 0 || activeShortlistsCount > 0) {
    //   throw new BadRequestException('Cannot delete unit with existing reservations or shortlists');
    // }

    // Soft delete unit
    await this.prisma.unit.update({
      where: { id: unitId },
      data: { isDeleted: true as any },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'UNIT_DELETE',
        entity: 'Unit',
        entityId: unitId,
        metadata: { unitNumber: unit.unitNumber, projectId: unit.projectId },
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Unit marked as deleted successfully' };
  }

  async restoreUnit(unitId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (!unit.isDeleted) {
      throw new BadRequestException('Unit is not deleted');
    }

    // Check if project is deleted
    const project = await this.prisma.project.findUnique({
      where: { id: unit.projectId },
    });

    if (project?.isDeleted) {
      throw new BadRequestException('Cannot restore unit because its project is deleted');
    }

    // Restore unit
    await this.prisma.unit.update({
      where: { id: unitId },
      data: { isDeleted: false as any },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'UNIT_RESTORE',
        entity: 'Unit',
        entityId: unitId,
        metadata: { unitNumber: unit.unitNumber, projectId: unit.projectId },
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Unit restored successfully' };
  }

  async uploadUnitImages(unitId: string, files: Express.Multer.File[], userId?: string, ipAddress?: string, userAgent?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const imageUrls: string[] = [];
    const uploadDir = join(process.cwd(), 'uploads', 'units', unit.projectId, unitId);
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const fileExtension = extname(file.originalname) || '.jpg';
      const generatedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExtension}`;
      const fullPath = join(uploadDir, generatedName);

      await fs.writeFile(fullPath, file.buffer);

      imageUrls.push(`/uploads/units/${unit.projectId}/${unitId}/${generatedName}`);
    }

    // Get existing images
    const existingImages = (unit.imageUrls as string[]) || [];
    const updatedImages = [...existingImages, ...imageUrls];

    const updated = await this.prisma.unit.update({
      where: { id: unitId },
      data: { imageUrls: updatedImages },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'UNIT_UPLOAD',
        entity: 'Unit',
        entityId: unitId,
        metadata: { imageCount: imageUrls.length },
        ipAddress,
        userAgent,
      });
    }

    return {
      ...updated,
      imageUrls: updatedImages,
    };
  }

  // ============================================================================
  // RESERVATIONS MANAGEMENT
  // ============================================================================

  async listReservations(dto: ListReservationsDto) {
    try {
      const { userId, projectId, unitId, status, paymentStatus, page = 1, limit = 20, includeDeleted = false } = dto;

      // Ensure page and limit are numbers
      const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
      const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.ReservationWhereInput = {};

      if (userId) {
        where.userId = userId;
      }

      if (projectId) {
        where.projectId = projectId;
      }

      if (unitId) {
        where.unitId = unitId;
      }

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      // Handle isDeleted filter
      // When includeDeleted = false, explicitly set to false to override PrismaService's auto-filter
      if (!includeDeleted) {
        where.isDeleted = false;
      }
      // Note: When includeDeleted = true, we don't set isDeleted, but PrismaService will auto-add isDeleted: false
      // This is a limitation - to truly include deleted records, we'd need to bypass the wrapper
      // For now, if includeDeleted = true, we'll still only get non-deleted records

      // Debug: Log the query
      console.log('ListReservations query:', JSON.stringify({ where, skip, take: limitNum, pageNum, limitNum, includeDeleted }, null, 2));

      // First, check total count without relations
      const total = await this.prisma.reservation.count({ where });
      console.log('ListReservations total count:', total);

      // Then fetch with relations
      const reservations = await this.prisma.reservation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          unit: true,
          project: true,
        },
      });

      console.log('ListReservations result:', {
        count: reservations.length,
        total,
        firstReservation: reservations[0] ? {
          id: reservations[0].id,
          hasUser: !!reservations[0].user,
          hasUnit: !!reservations[0].unit,
          hasProject: !!reservations[0].project,
        } : null,
      });

      // Map reservations to response format
      const mappedData = reservations.map(r => {
        try {
          return {
            id: r.id,
            userId: r.userId,
            unitId: r.unitId,
            projectId: r.projectId,
            status: r.status,
            lockedAt: r.lockedAt,
            expiresAt: r.expiresAt,
            confirmedAt: r.confirmedAt,
            depositAmount: r.depositAmount ? Number(r.depositAmount) : 0,
            paymentIntentId: r.paymentIntentId,
            paymentStatus: r.paymentStatus,
            paymentMethod: r.paymentMethod,
            buyerName: r.buyerName,
            buyerEmail: r.buyerEmail,
            buyerPhone: r.buyerPhone,
            source: r.source,
            campaign: r.campaign,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            user: r.user ? {
              id: r.user.id,
              email: r.user.email,
              firstName: r.user.firstName,
              lastName: r.user.lastName,
              phoneNumber: r.user.phoneNumber,
            } : null,
            unit: r.unit ? {
              id: r.unit.id,
              unitNumber: r.unit.unitNumber,
              unitType: r.unit.unitType,
              price: r.unit.price ? Number(r.unit.price) : 0,
            } : null,
            project: r.project ? {
              id: r.project.id,
              name: r.project.name,
              slug: r.project.slug,
            } : null,
          };
        } catch (error) {
          console.error('Error mapping reservation:', r.id, error);
          return null;
        }
      }).filter(r => r !== null);

      const result = {
        data: mappedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };

      console.log('ListReservations final result:', {
        dataLength: result.data.length,
        pagination: result.pagination,
      });

      return result;
    } catch (error) {
      console.error('Error in listReservations:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async exportReservationsToCSV(): Promise<string> {
    // Fetch all reservations with relations
    const reservations = await this.prisma.reservation.findMany({
      where: {
        isDeleted: false as any,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        unit: true,
        project: true,
      },
    });

    // CSV headers
    const headers = [
      'Reservation ID',
      'User Name',
      'User Email',
      'User Phone',
      'Unit Number',
      'Unit Type',
      'Project Name',
      'Status',
      'Payment Status',
      'Deposit Amount',
      'Locked At',
      'Expires At',
      'Confirmed At',
      'Created At',
    ];

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format date
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return '';
      return date.toISOString();
    };

    // Build CSV rows
    const rows = reservations.map((r) => {
      const userName = r.user
        ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || ''
        : '';
      const userEmail = r.user?.email || '';
      const userPhone = r.user?.phoneNumber || '';
      const unitNumber = r.unit?.unitNumber || '';
      const unitType = r.unit?.unitType || '';
      const projectName = r.project?.name || '';
      const depositAmount = r.depositAmount ? Number(r.depositAmount).toFixed(2) : '0.00';

      return [
        escapeCSV(r.id),
        escapeCSV(userName),
        escapeCSV(userEmail),
        escapeCSV(userPhone),
        escapeCSV(unitNumber),
        escapeCSV(unitType),
        escapeCSV(projectName),
        escapeCSV(r.status),
        escapeCSV(r.paymentStatus),
        escapeCSV(depositAmount),
        escapeCSV(formatDate(r.lockedAt)),
        escapeCSV(formatDate(r.expiresAt)),
        escapeCSV(formatDate(r.confirmedAt)),
        escapeCSV(formatDate(r.createdAt)),
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    return csvContent;
  }

  async exportUsersToCSV(): Promise<string> {
    // Fetch all users (excluding deleted by default)
    const users = await this.prisma.user.findMany({
      where: {
        isDeleted: false as any,
        role: { not: 'SUPER_ADMIN' as any },
      },
      orderBy: { createdAt: 'desc' },
    });

    // CSV headers
    const headers = [
      'ID',
      'Phone Number',
      'Email',
      'First Name',
      'Last Name',
      'Date of Birth',
      'Gender',
      'Address',
      'City',
      'Country',
      'Avatar URL',
      'Role',
      'Is Verified',
      'Interest',
      'Referral',
      'GHL Contact ID',
      'Profile Completion Skipped',
      'Created At',
      'Updated At',
    ];

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format date
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return '';
      return date.toISOString();
    };

    // Build CSV rows
    const rows = users.map((u) => {
      return [
        escapeCSV(u.id),
        escapeCSV(u.phoneNumber),
        escapeCSV(u.email),
        escapeCSV(u.firstName),
        escapeCSV(u.lastName),
        escapeCSV(formatDate(u.dateOfBirth)),
        escapeCSV(u.gender),
        escapeCSV(u.address),
        escapeCSV(u.city),
        escapeCSV(u.country),
        escapeCSV(u.avatarUrl),
        escapeCSV(u.role),
        escapeCSV(u.isVerified),
        escapeCSV(u.interest),
        escapeCSV(u.referral),
        escapeCSV(u.ghlContactId),
        escapeCSV(u.profileCompletionSkipped),
        escapeCSV(formatDate(u.createdAt)),
        escapeCSV(formatDate(u.updatedAt)),
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    return csvContent;
  }

  async getReservationDetail(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
        unit: {
          include: {
            project: true,
          },
        },
        project: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return {
      ...reservation,
      depositAmount: Number(reservation.depositAmount),
      unit: {
        ...reservation.unit,
        size: Number(reservation.unit.size),
        bathrooms: Number(reservation.unit.bathrooms),
        price: Number(reservation.unit.price),
        project: {
          ...reservation.unit.project,
          depositAmount: Number(reservation.unit.project.depositAmount),
        },
      },
      project: {
        ...reservation.project,
        depositAmount: Number(reservation.project.depositAmount),
      },
    };
  }

  async updateReservationStatus(reservationId: string, dto: UpdateReservationStatusDto, userId?: string, ipAddress?: string, userAgent?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const updateData: any = { status: dto.status };

    if (dto.status === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
      // Update unit status to RESERVED
      await this.prisma.unit.update({
        where: { id: reservation.unitId },
        data: { status: 'RESERVED' },
      });
    } else if (dto.status === 'CANCELLED' || dto.status === 'EXPIRED') {
      // Update unit status back to AVAILABLE
      await this.prisma.unit.update({
        where: { id: reservation.unitId },
        data: { status: 'AVAILABLE' },
      });
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
      },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'RESERVATION_STATUS_UPDATE',
        entity: 'Reservation',
        entityId: reservationId,
        metadata: { oldStatus: reservation.status, newStatus: dto.status, unitId: reservation.unitId },
        ipAddress,
        userAgent,
      });
    }

    return updated;
  }

  async updatePaymentStatus(reservationId: string, dto: UpdatePaymentStatusDto, userId?: string, ipAddress?: string, userAgent?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { paymentStatus: dto.paymentStatus },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
      },
    });

    // Log activity
    if (userId) {
      await this.activityLogService.createActivityLog({
        userId,
        action: 'RESERVATION_PAYMENT_UPDATE',
        entity: 'Reservation',
        entityId: reservationId,
        metadata: { oldPaymentStatus: reservation.paymentStatus, newPaymentStatus: dto.paymentStatus, unitId: reservation.unitId },
        ipAddress,
        userAgent,
      });
    }

    return updated;
  }

  // ============================================================================
  // ACTIVITY LOGS
  // ============================================================================

  async listActivityLogs(dto: ListActivityLogsDto) {
    const { userId, action, entity, search, entityId, startDate, endDate, page = 1, limit = 20 } = dto;
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ActivityLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (entity) {
      where.entity = entity;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Explicitly set isDeleted to false to work with PrismaService soft delete filter
    where.isDeleted = false;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      } as any),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async exportActivityLogsToCSV(): Promise<string> {
    const logs = await this.prisma.activityLog.findMany({
      where: {
        isDeleted: false as any,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    } as any);

    const headers = [
      'Log ID',
      'User ID',
      'User Name',
      'User Email',
      'Action',
      'Entity',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Metadata',
      'Created At',
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return '';
      return date.toISOString();
    };

    const rows = logs.map((log) => {
      const userName = log.user
        ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim()
        : '';

      return [
        escapeCSV(log.id),
        escapeCSV(log.userId),
        escapeCSV(userName),
        escapeCSV(log.user?.email || ''),
        escapeCSV(log.action),
        escapeCSV(log.entity),
        escapeCSV(log.entityId),
        escapeCSV(log.ipAddress),
        escapeCSV(log.userAgent),
        escapeCSV(log.metadata ? JSON.stringify(log.metadata) : ''),
        escapeCSV(formatDate(log.createdAt)),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getStatistics(dto: { period?: string; days?: number }) {
    const { period = 'month', days = 30 } = dto;

    // Normalize dates to UTC midnight for consistent date boundaries
    const now = new Date();
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1, 0, 0, 0, 0));

    // Generate date range array using UTC dates at midnight
    const dateRange: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);
      dateRange.push(date);
    }

    // Get new registrations by date
    const newRegistrations = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
        role: { not: 'SUPER_ADMIN' as any },
      },
      select: {
        createdAt: true,
      },
    });

    // Get activity logs (as page views/visits) by date
    // Only count actions related to page views/visits, not admin actions
    const visitActions = [
      'PAGE_VIEW',
      'EXPLORE_PAGE_VIEW',
      'UNIT_VIEW',
      'PROJECT_VIEW',
      'LOGIN',
      'SEARCH',
      'HOME_PAGE_VIEW',
    ];

    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
        action: {
          in: visitActions,
        },
      },
      select: {
        createdAt: true,
        action: true,
      },
    });

    // Group by date using UTC methods to match database UTC dates
    const formatDate = (date: Date) => {
      const d = new Date(date);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };

    const registrationsByDate: Record<string, number> = {};
    const visitsByDate: Record<string, number> = {};

    // Initialize all dates with 0
    dateRange.forEach(date => {
      const dateStr = formatDate(date);
      registrationsByDate[dateStr] = 0;
      visitsByDate[dateStr] = 0;
    });

    // Count registrations by date
    newRegistrations.forEach(user => {
      const dateStr = formatDate(user.createdAt);
      if (registrationsByDate[dateStr] !== undefined) {
        registrationsByDate[dateStr]++;
      }
    });

    // Count visits by date
    activityLogs.forEach(log => {
      const dateStr = formatDate(log.createdAt);
      if (visitsByDate[dateStr] !== undefined) {
        visitsByDate[dateStr]++;
      }
    });

    // Format data for chart
    const chartData = dateRange.map(date => {
      const dateStr = formatDate(date);
      return {
        date: dateStr,
        registrations: registrationsByDate[dateStr] || 0,
        visits: visitsByDate[dateStr] || 0,
      };
    });

    return {
      period,
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data: chartData,
      summary: {
        totalRegistrations: newRegistrations.length,
        totalVisits: activityLogs.length,
        averageRegistrationsPerDay: (newRegistrations.length / days).toFixed(2),
        averageVisitsPerDay: (activityLogs.length / days).toFixed(2),
      },
    };
  }
}
