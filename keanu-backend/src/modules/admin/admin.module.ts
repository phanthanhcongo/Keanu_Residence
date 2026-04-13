import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/services/prisma.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { UserManipulationService } from './user-manipulation.service';
import { UserCountGateway } from './user-count.gateway';

@Module({
  imports: [AuthModule, forwardRef(() => ProjectsModule), forwardRef(() => ReservationsModule)],
  controllers: [AdminController],
  providers: [
    AdminService,
    PrismaService,
    ActivityLogService,
    UserManipulationService,
    UserCountGateway,
  ],
  exports: [AdminService, UserManipulationService],
})
export class AdminModule { }

