import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityLogService, PrismaService],
  exports: [ActivityService],
})
export class ActivityModule {}

