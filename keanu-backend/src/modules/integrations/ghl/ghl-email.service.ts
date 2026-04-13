import { Injectable, Logger, Optional } from '@nestjs/common';
import { GHLOAuthService } from './ghl-oauth.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { GHLContactService } from './ghl-contact.service';

export interface GhlEmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

@Injectable()
export class GhlEmailService {
  private readonly logger = new Logger(GhlEmailService.name);
  private readonly enabled: boolean;

  constructor(
    @Optional() private readonly ghlOAuthService?: GHLOAuthService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly ghlContactService?: GHLContactService,
  ) {
    this.enabled = process.env.GHL_EMAIL_ENABLED !== 'false'; // Default to true

    if (this.enabled) {
      this.logger.log('GHL Email Service initialized with Conversations API');
    } else {
      this.logger.log('GHL Email Service is disabled');
    }
  }

  /**
   * Send email via GHL Conversations API
   * @param payload Email payload
   * @returns true if successful, false otherwise
   */
  async sendEmail(payload: GhlEmailPayload): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug('GHL Email Service is disabled, skipping API call');
      return false;
    }

    // Check if required services are available
    if (!this.ghlOAuthService || !this.prisma) {
      this.logger.debug('GHL OAuth Service or Prisma Service not available, skipping GHL email');
      return false;
    }

    try {
      let ghlContactId: string | null = null;
      let targetUserId: string | null = null;

      // 1. Try to find user in DB
      const user = await this.prisma.user.findUnique({
        where: { email: payload.to },
        select: { id: true, ghlContactId: true },
      });

      if (user) {
        ghlContactId = user.ghlContactId;
        targetUserId = user.id;
      }

      // 2. If no contactId, try to create one (requires GHLContactService)
      if (!ghlContactId && this.ghlContactService) {
        this.logger.log(`No GHL contact ID found for ${payload.to}, attempting to upsert...`);
        const contactResult = await this.ghlContactService.handleUserEvent('enquiry', {
          email: payload.to,
        });
        ghlContactId = contactResult?.contactId || null;
      }

      if (!ghlContactId) {
        this.logger.warn(`Could not determine GHL contact ID for ${payload.to}`);
        return false;
      }

      // 3. Get GHL Client (Try OAuth first, then Static)
      let client: any = null;

      // Try active OAuth integration
      const integration = await this.prisma.integration.findFirst({
        where: { providerName: 'ghl', status: 'active', isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });

      if (integration) {
        try {
          const result = await this.ghlOAuthService.createGHLClient(integration.userId || '');
          client = result.client;
        } catch (e) {
          this.logger.warn('Failed to create OAuth GHL client, trying static fallback', e.message);
        }
      }

      // Static fallback
      if (!client) {
        const staticResult = await this.ghlOAuthService.createStaticClient();
        if (staticResult) {
          client = staticResult.client;
          this.logger.log('Using static GHL client for email sending');
        }
      }

      if (!client) {
        this.logger.debug('No GHL client available (OAuth or Static), falling back to other providers');
        return false;
      }

      // 4. Prepare and send message
      const messageData = {
        contactId: ghlContactId,
        type: 'Email' as const,
        status: 'pending' as const,
        subject: payload.subject,
        html: payload.html || payload.text,
        message: payload.text,
        emailFrom: payload.from || process.env.GHL_DEFAULT_FROM_EMAIL || process.env.SMTP_FROM || 'Residences@keanubali.com',
        emailTo: payload.to,
      };

      this.logger.debug('Sending message via GHL Conversations API', {
        to: payload.to,
        subject: payload.subject,
        contactId: ghlContactId,
      });

      const response = await client.sendMessage(messageData);

      if (response?.messageId || response?.id) {
        this.logger.log(`✅ Email sent via GHL Conversations API to ${payload.to}`);
        return true;
      } else {
        this.logger.warn(`⚠️ GHL Conversations API returned unexpected response:`, response);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email via GHL to ${payload.to}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return false;
    }
  }
}

