import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { GHLModule } from '../integrations/ghl/ghl.module';

@Module({
  imports: [forwardRef(() => GHLModule)], // Use forwardRef to handle circular dependency
  providers: [EmailService, SmsService],
  exports: [EmailService, SmsService],
})
export class NotificationsModule {}

