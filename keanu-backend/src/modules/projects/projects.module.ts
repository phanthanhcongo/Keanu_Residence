import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from 'src/common/services/prisma.service';
import { ProjectGateway } from './project.gateway';
import { ProjectLaunchProcessor } from './project-launch.processor';
import { CacheModule } from '@nestjs/cache-manager';
import { ReservationsModule } from '../reservations/reservations.module';


@Module({
  imports: [
    CacheModule.register({
      url: process.env.REDIS_URL,  // redis://localhost:6379
      ttl: 60,                     // default 60 seconds
    }),
    // registers a named queue 'project-launch'
    BullModule.registerQueue({
      name: 'project-launch',
    }),
    forwardRef(() => ReservationsModule),
  ],
  providers: [
    ProjectsService,
    PrismaService,
    ProjectLaunchProcessor,
    ProjectGateway,
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService, ProjectGateway],
})
export class ProjectsModule { }

