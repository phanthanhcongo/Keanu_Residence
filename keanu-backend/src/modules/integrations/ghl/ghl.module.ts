import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GHLOAuthController } from './ghl-oauth.controller';
import { GHLOAuthCallbackController } from './ghl-oauth-callback.controller';
import { GHLContactController } from './ghl-contact.controller';
import { GHLOAuthService } from './ghl-oauth.service';
import { GHLContactService } from './ghl-contact.service';
import { GhlEmailService } from './ghl-email.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { GhlWebhookController } from './ghl-webhook.controller';
import { GhlPaymentService } from './ghl-payment.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => NotificationsModule), // Use forwardRef to handle circular dependency
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') || config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [GHLOAuthController, GHLOAuthCallbackController, GHLContactController, GhlWebhookController],
  providers: [GHLOAuthService, GHLContactService, GhlEmailService, PrismaService, GhlPaymentService],
  exports: [GHLOAuthService, GHLContactService, GhlEmailService],
})
export class GHLModule {}

