import { Module } from '@nestjs/common';
import { ShortlistController } from './shortlist.controller';
import { ShortlistService } from './shortlist.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GHLModule } from '../integrations/ghl/ghl.module';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Module({
  imports: [AuthModule, GHLModule],
  controllers: [ShortlistController],
  providers: [ShortlistService, PrismaService, ActivityLogService],
  exports: [ShortlistService],
})
export class ShortlistModule { }

