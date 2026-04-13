import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { PrismaService } from '../../common/services/prisma.service';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, PrismaService, ActivityLogService],
  exports: [UnitsService],
})
export class UnitsModule { }

