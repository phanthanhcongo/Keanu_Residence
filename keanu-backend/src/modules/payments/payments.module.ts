import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController, WebhookController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { GHLModule } from '../integrations/ghl/ghl.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    GHLModule,
    NotificationsModule,
    forwardRef(() => ReservationsModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, PrismaService, ActivityLogService],
  exports: [PaymentsService],
})
export class PaymentsModule { }

