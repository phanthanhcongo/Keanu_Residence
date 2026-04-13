import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationLockService } from './reservation-lock.service';
import { ReservationsGateway } from './reservations.gateway';
import { ReservationExpiryProcessor } from './reservation-expiry.processor';
import { PrismaService } from 'src/common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GHLModule } from '../integrations/ghl/ghl.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShortlistModule } from '../shortlist/shortlist.module';
import { ActivityLogService } from '../../common/services/activity-log.service';
import Redis from 'ioredis';

@Module({
  imports: [
    // Bull queue for reservation expiry jobs
    BullModule.registerQueue({
      name: 'reservation-expiry',
    }),
    AuthModule,
    GHLModule,
    PaymentsModule,
    NotificationsModule,
    ShortlistModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationLockService,
    ReservationExpiryProcessor,
    PrismaService,
    ReservationsGateway,
    ActivityLogService,
    // Direct ioredis client for atomic lock operations
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        return new Redis(redisUrl);
      },
    },
  ],
  exports: [ReservationsService, ReservationLockService, PrismaService, ReservationsGateway],
})
export class ReservationsModule { }
