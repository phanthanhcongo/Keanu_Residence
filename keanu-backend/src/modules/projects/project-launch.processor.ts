import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { ProjectGateway } from './project.gateway';
import { ReservationsGateway } from '../reservations/reservations.gateway';


@Processor('project-launch')
@Injectable()
export class ProjectLaunchProcessor {
  private readonly logger = new Logger(ProjectLaunchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ProjectGateway,
    @Optional() private readonly reservationsGateway?: ReservationsGateway,
  ) { }

  // job.data = { projectId: string }
  @Process('launch')
  async handleLaunch(job: Job<{ projectId: string }>) {
    const { projectId } = job.data;
    this.logger.log(`Running launch job for project ${projectId} (job ${job.id})`);

    try {
      // Validate and set LIVE only if current status is UPCOMING (defensive)
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        this.logger.warn(`Project ${projectId} not found`);
        return;
      }

      if (project.status !== 'UPCOMING') {
        // Retry after 2s to handle race condition with DB transaction commit
        this.logger.log(`Project ${projectId} status is ${project.status} - retrying after 2s`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retried = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!retried || retried.status !== 'UPCOMING') {
          this.logger.log(`Project ${projectId} still ${retried?.status} after retry - skipping`);
          return;
        }
      }

      // Update project status to LIVE
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'LIVE', updatedAt: new Date() },
      });

      // Update all units from UNAVAILABLE to AVAILABLE
      const updateResult = await this.prisma.unit.updateMany({
        where: {
          projectId: projectId,
          status: 'UNAVAILABLE',
        },
        data: {
          status: 'AVAILABLE',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Project ${projectId} set to LIVE. Updated ${updateResult.count} units from UNAVAILABLE to AVAILABLE`
      );

      // Broadcast via websocket for real-time frontend updates
      this.gateway.emitProjectLive(projectId);

      // Also emit on /reservations namespace so the frontend receives it
      if (this.reservationsGateway) {
        this.reservationsGateway.emitProjectLive(projectId);
      }
    } catch (err) {
      this.logger.error(`Failed to process launch job for project ${projectId}`, err);
      throw err; // let Bull handle retries if configured
    }
  }
}
