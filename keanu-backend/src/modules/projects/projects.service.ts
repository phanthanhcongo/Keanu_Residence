import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { zonedTimeToUtc } from 'date-fns-tz';

export interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export interface ProjectCountdownResponse {
  projectId: string;
  projectName: string;
  slug: string;
  launchDate: string;
  launchTime: string;
  timezone: string;
  countdown: CountdownData;
  isLive: boolean;
  status: string;
  serverTime: string;
}

@Injectable()
export class ProjectsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('project-launch') private readonly launchQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private jobIdFor(id: string) {
    return `project-launch:${id}`;
  }

  // ------------------------------------------------------------
  //  AUTO RESCHEDULE ALL UPCOMING PROJECTS ON SERVER START
  // ------------------------------------------------------------
  async onModuleInit() {
    const upcoming = await this.prisma.project.findMany({
      where: { status: 'UPCOMING' },
      select: { id: true, launchDate: true, launchTime: true, timezone: true },
    });

    for (const p of upcoming) {
      // Skip if launchDate is null or invalid
      if (!p.launchDate) {
        this.logger.warn(`Skipping project ${p.id}: launchDate is null`);
        continue;
      }
      
      try {
      await this.scheduleLaunchJob(p.id, p.launchDate, p.launchTime, p.timezone);
      } catch (error) {
        this.logger.error(`Failed to schedule launch job for project ${p.id}:`, error);
      }
    }
  }

  // ------------------------------------------------------------
  //  QUEUE SCHEDULING
  // ------------------------------------------------------------
  async scheduleLaunchJob(
    id: string,
    launchDate: Date | string,
    launchTime = '00:00',
    timezone = 'UTC',
  ) {
    // Validate launchDate
    if (!launchDate) {
      throw new Error(`Invalid launchDate for project ${id}: launchDate is null or undefined`);
    }

    const dateObj = new Date(launchDate);
    if (isNaN(dateObj.getTime())) {
      throw new Error(`Invalid launchDate for project ${id}: ${launchDate} is not a valid date`);
    }

    let tz = timezone?.toString() || 'UTC';
    if (tz.startsWith('UTC')) tz = tz.replace(/^UTC/, '') || 'UTC';

    const datePart = dateObj.toISOString().split('T')[0];
    const combined = `${datePart} ${launchTime}`;

    this.logger.debug(
      `Scheduling: id=${id} -> ${combined} (${tz})`
    );

    let targetUtc: Date;
    try {
      targetUtc = zonedTimeToUtc(combined, tz);
      
      // Validate targetUtc
      if (isNaN(targetUtc.getTime())) {
        throw new Error(`Invalid target date calculated for project ${id}`);
      }
    } catch (error) {
      this.logger.warn(`Bad timezone "${tz}" or invalid date, fallback UTC`);
      try {
      targetUtc = zonedTimeToUtc(combined, 'UTC');
        if (isNaN(targetUtc.getTime())) {
          throw new Error(`Invalid date even with UTC fallback for project ${id}`);
        }
      } catch (fallbackError) {
        throw new Error(`Failed to schedule launch job for project ${id}: ${fallbackError.message}`);
      }
    }

    const delay = Math.max(targetUtc.getTime() - Date.now(), 0);
    const jobId = this.jobIdFor(id);

    const existing = await this.launchQueue.getJob(jobId);
    if (existing) await existing.remove();

    await this.launchQueue.add(
      'launch',
      { projectId: id },
      { jobId, delay, removeOnComplete: true },
    );

    this.logger.debug(
      `Job scheduled id=${id} | UTC=${targetUtc.toISOString()} | delay=${delay}`
    );
  }

  // ------------------------------------------------------------
  //  CRUD HELPERS
  // ------------------------------------------------------------
  async createProject(dto: any) {
    const p = await this.prisma.project.create({ data: dto });
    if (p.launchDate)
      await this.scheduleLaunchJob(p.id, p.launchDate, p.launchTime, p.timezone);
    return p;
  }

  async updateProject(id: string, dto: any) {
    const p = await this.prisma.project.update({ where: { id }, data: dto });
    if (dto.launchDate || dto.launchTime || dto.timezone) {
      await this.scheduleLaunchJob(id, p.launchDate, p.launchTime, p.timezone);
    }
    return p;
  }

  // ------------------------------------------------------------
  //  GET PROJECTS
  // ------------------------------------------------------------
  async getProjectBySlug(slug: string) {
    const p = await this.prisma.project.findUnique({
      where: { slug },
    });

    if (!p) throw new NotFoundException(`Project not found`);

    return {
      ...p,
      depositAmount: p.depositAmount.toNumber(),
    };
  }

  async getAllProjects() {
    const projects = await this.prisma.project.findMany({
      orderBy: { launchDate: 'asc' },
    });

    return projects.map((p) => ({
      ...p,
      depositAmount: p.depositAmount.toNumber(),
    }));
  }

  async getPrimaryProject() {
    const project = await this.prisma.project.findFirst({
      where: { isPrimary: true, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException('No primary project found');
    }

    return {
      ...project,
      depositAmount: project.depositAmount.toNumber(),
    };
  }

  // ------------------------------------------------------------
  //  COUNTDOWN HELPERS
  // ------------------------------------------------------------
  private calculateCountdown(
    launchDate: Date | string,
    launchTime: string,
    timezone: string,
  ): CountdownData {
    // Normalize inputs
    const dateObj = new Date(launchDate);
    if (!launchDate || isNaN(dateObj.getTime()) || !launchTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }

    // Normalize timezone (supports values like "UTC+8")
    let tz = timezone?.toString() || 'UTC';
    if (tz.startsWith('UTC')) {
      tz = tz.replace(/^UTC/, '') || 'UTC';
    }

    // Build combined date/time string in project timezone
    const datePart = dateObj.toISOString().split('T')[0];
    const combined = `${datePart} ${launchTime}`;

    let targetUtc: Date;
    try {
      targetUtc = zonedTimeToUtc(combined, tz);

      if (isNaN(targetUtc.getTime())) {
        throw new Error('Invalid target date after timezone conversion');
      }
    } catch (error) {
      this.logger.warn(`calculateCountdown timezone fallback to UTC. tz="${tz}" err=${(error as Error).message}`);
      try {
        targetUtc = zonedTimeToUtc(combined, 'UTC');
      } catch {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
      }
    }

    const diff = targetUtc.getTime() - Date.now();

    if (diff <= 0)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      totalMs: diff,
    };
  }

  // ------------------------------------------------------------
  //  COUNTDOWN API + CACHE
  // ------------------------------------------------------------
  async getCountdown(slug: string): Promise<ProjectCountdownResponse> {
    const cacheKey = `countdown:${slug}`;
    const cached = await this.cacheManager.get<ProjectCountdownResponse>(cacheKey);

    if (cached) {
      const countdown = this.calculateCountdown(
        new Date(cached.launchDate),
        cached.launchTime,
        cached.timezone,
      );

      return {
        ...cached,
        countdown,
        isLive: countdown.totalMs <= 0,
        serverTime: new Date().toISOString(),
      };
    }

    const p = await this.getProjectBySlug(slug);

    const countdown = this.calculateCountdown(p.launchDate, p.launchTime, p.timezone);
    const isLive = countdown.totalMs <= 0 || p.status === 'LIVE';

    const res: ProjectCountdownResponse = {
      projectId: p.id,
      projectName: p.name,
      slug: p.slug,
      launchDate: p.launchDate.toISOString().split('T')[0],
      launchTime: p.launchTime,
      timezone: p.timezone,
      countdown,
      isLive,
      status: p.status,
      serverTime: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, res, 60000);

    return res;
  }

  async getPrimaryProjectCountdown(): Promise<ProjectCountdownResponse> {
    const primaryProject = await this.prisma.project.findFirst({
      where: { isPrimary: true, isDeleted: false },
    });

    if (!primaryProject) {
      throw new NotFoundException('No primary project found');
    }

    const cacheKey = `countdown:${primaryProject.slug}`;
    const cached = await this.cacheManager.get<ProjectCountdownResponse>(cacheKey);

    if (cached) {
      const countdown = this.calculateCountdown(
        new Date(cached.launchDate),
        cached.launchTime,
        cached.timezone,
      );

      return {
        ...cached,
        countdown,
        isLive: countdown.totalMs <= 0,
        serverTime: new Date().toISOString(),
      };
    }

    const countdown = this.calculateCountdown(
      primaryProject.launchDate,
      primaryProject.launchTime,
      primaryProject.timezone,
    );
    const isLive = countdown.totalMs <= 0 || primaryProject.status === 'LIVE';

    const res: ProjectCountdownResponse = {
      projectId: primaryProject.id,
      projectName: primaryProject.name,
      slug: primaryProject.slug,
      launchDate: primaryProject.launchDate.toISOString().split('T')[0],
      launchTime: primaryProject.launchTime,
      timezone: primaryProject.timezone,
      countdown,
      isLive,
      status: primaryProject.status,
      serverTime: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, res, 60000);

    return res;
  }

  // ------------------------------------------------------------
  //  CHECK UPCOMING -> LIVE
  // ------------------------------------------------------------
  async updateProjectStatusToLive() {
    const upcoming = await this.prisma.project.findMany({
      where: { status: 'UPCOMING' },
    });

    for (const p of upcoming) {
      const cd = this.calculateCountdown(p.launchDate, p.launchTime, p.timezone);

      if (cd.totalMs <= 0) {
        await this.prisma.project.update({
          where: { id: p.id },
          data: { status: 'LIVE' },
        });

        await this.cacheManager.del(`countdown:${p.slug}`);
      }
    }
  }
}
