import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private emailService: EmailService) {
    // In development mode, send SMS OTP via email (MailHog) for testing
    // In production, can integrate with Twilio, Vonage, AWS SNS, etc.
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      this.logger.log('📱 SMS service initialized in development mode (sending via email/MailHog)');
    } else {
      this.logger.log('📱 SMS service initialized in production mode');
      // TODO: Initialize SMS provider (Twilio, Vonage, etc.)
    }
  }

  /**
   * Send OTP via SMS
   * @param phoneNumber Phone number receiving SMS
   * @param otpCode 6-digit OTP code
   * @param purpose Purpose of sending (register, reset password, etc.)
   */
  async sendOtpSms(phoneNumber: string, otpCode: string, purpose: 'register' | 'reset-password' = 'register'): Promise<void> {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Format phone number (remove spaces, dashes, etc.)
    const formattedPhone = phoneNumber.replace(/[\s\-()]/g, '');

    // Create message
    let message: string;
    if (purpose === 'reset-password') {
      message = `Keanu Residences: Your password reset OTP code is ${otpCode}. The code is valid for 2 minutes. Do not share this code with anyone.`;
    } else {
      message = `Keanu Residences: Your account verification OTP code is ${otpCode}. The code is valid for 2 minutes. Do not share this code with anyone.`;
    }

    if (isDevelopment) {
      // Development mode: Send SMS OTP via email (MailHog) for easy testing
      // Create test email address from phone number
      const testEmail = `sms-${formattedPhone}@mailhog.local`;

      try {
        await this.emailService.sendSmsOtpTestEmail(testEmail, formattedPhone, otpCode, message, purpose);
        // this.logger.log(`✅ [DEV] SMS OTP sent to ${formattedPhone} (via email: ${testEmail})`);
        this.logger.log(`📱 [DEV] OTP Code: ${otpCode}`);
      } catch (error) {
        this.logger.error(`❌ [DEV] Failed to send SMS OTP via email:`, error);
        // Fallback: log to console if email sending fails
        console.log('='.repeat(50));
        console.log('📱 SMS MESSAGE (Development Mode - Fallback)');
        console.log('='.repeat(50));
        console.log(`To: ${formattedPhone}`);
        console.log(`Message: ${message}`);
        console.log(`OTP Code: ${otpCode}`);
        console.log('='.repeat(50));
      }
    } else {
      // Production mode: Send real SMS
      try {
        await this.sendSmsProduction(formattedPhone, message);
        // this.logger.log(`✅ OTP SMS sent to ${formattedPhone}`);
      } catch (error) {
        this.logger.error(`❌ Failed to send OTP SMS to ${formattedPhone}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`SMS sending failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Send SMS in production mode
   * TODO: Implement with Twilio, Vonage, AWS SNS, etc.
   */
  private async sendSmsProduction(phoneNumber: string, message: string): Promise<void> {
    // Option 1: Twilio
    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    // 
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: fromNumber,
    //   to: phoneNumber,
    // });

    // Option 2: Vonage (Nexmo)
    // const Vonage = require('@vonage/server-sdk');
    // const vonage = new Vonage({
    //   apiKey: process.env.VONAGE_API_KEY,
    //   apiSecret: process.env.VONAGE_API_SECRET,
    // });
    // 
    // await vonage.sms.send({
    //   to: phoneNumber,
    //   from: process.env.VONAGE_FROM_NUMBER,
    //   text: message,
    // });

    // Option 3: AWS SNS
    // const AWS = require('aws-sdk');
    // const sns = new AWS.SNS({
    //   region: process.env.AWS_REGION,
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // });
    // 
    // await sns.publish({
    //   PhoneNumber: phoneNumber,
    //   Message: message,
    // }).promise();

    // Temporarily throw error if not configured
    throw new Error('SMS service not configured. Please set up Twilio, Vonage, or AWS SNS in production.');
  }
}

