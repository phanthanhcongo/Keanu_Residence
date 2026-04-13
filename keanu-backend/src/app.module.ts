import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ReservationsModule } from './modules/reservations/reservations.module';
import { ReservationCycleModule } from './modules/reservation-cycle/reservation-cycle.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ShortlistModule } from './modules/shortlist/shortlist.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-ioredis-yet';
import { AuthModule } from './modules/auth/auth.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { ActivityModule } from './modules/activity/activity.module';
import { GHLModule } from './modules/integrations/ghl/ghl.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { BullModule } from '@nestjs/bull';
import { DatabaseInitService } from './common/services/database-init.service';
import { PrismaService } from './common/services/prisma.service';
import { GeolocationService } from './common/services/geolocation.service';

const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

@Module({
  imports: [
    // #1 Load .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),


    // #2 Schedule (still available for other purposes)
    ScheduleModule.forRoot(),

    // #3 Redis Cache (OK to use url)
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrlStr = configService.get<string>('REDIS_URL');
        return {
          isGlobal: true,
          store: redisStore as any,
          url: redisUrlStr,     // <--- Cache manager SUPPORTS url
          ttl: 600,
          max: 1000
        };
      },
    }),

    // #4 Bull MQ (NO url property allowed)
    BullModule.forRoot({
      redis: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
      },
    }),

    // Feature modules
    ReservationsModule,
    ReservationCycleModule,
    AuthModule,
    UnitsModule,
    UsersModule,
    AdminModule,
    ActivityModule,
    ProjectsModule,
    ShortlistModule,
    GHLModule,
    PaymentsModule,
    CurrencyModule,
  ],

  controllers: [AppController],
  providers: [AppService, DatabaseInitService, PrismaService, GeolocationService],
  exports: [GeolocationService], // Export to make available in other modules
})
export class AppModule { }
