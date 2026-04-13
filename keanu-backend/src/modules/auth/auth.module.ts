import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GHLModule } from '../integrations/ghl/ghl.module';
import { GHLContactService } from '../integrations/ghl/ghl-contact.service';
import { GeolocationService } from '../../common/services/geolocation.service';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Module({
  imports: [
    NotificationsModule,
    ConfigModule,
    PassportModule,
    GHLModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret =
          config.get<string>('JWT_ACCESS_SECRET') ||
          config.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production';

        // Lấy từ env, nếu không có thì mặc định 1m
        const expiresInEnv =
          config.get<string>('JWT_ACCESS_EXPIRES_IN') || '30m';

        return {
          secret,
          signOptions: {
            // cast để TS khỏi phàn nàn, runtime vẫn ok
            expiresIn: expiresInEnv as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, JwtAuthGuard, GeolocationService, ActivityLogService],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule { }
