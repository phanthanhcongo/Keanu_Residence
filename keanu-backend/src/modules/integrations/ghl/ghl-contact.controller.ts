import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GHLContactService, GHLEventType } from './ghl-contact.service';
import { EmailService } from '../../notifications/email.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('integrations')
@Controller('v1/integrations/ghl/contacts')
export class GHLContactController {
  private readonly logger = new Logger(GHLContactController.name);

  constructor(
    private readonly ghlContactService: GHLContactService,
    private readonly emailService: EmailService,
  ) { }

  // Events endpoint must be before :contactId routes to avoid route conflicts
  @Post('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle user event: upsert contact + add tags' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['eventType', 'contactData'],
      properties: {
        eventType: {
          type: 'string',
          enum: ['signup', 'completedProfile', 'shortlist', 'enquiry', 'reserve', 'deposit', 'login', 'buying_to_live', 'buying_as_investment', 'buying_for_holiday', 'not_a_buyer'],
          description: 'Type of event',
        },
        contactData: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            gender: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
            dateOfBirth: { type: 'string' },
            interest: { type: 'string' },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            unitId: { type: 'string', description: 'Unit ID for shortlist/enquiry events' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Event handled successfully' })
  async handleEvent(
    @Body()
    body: {
      eventType: GHLEventType;
      contactData: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        [key: string]: any;
      };
      metadata?: {
        unitId?: string;
        [key: string]: any;
      };
    },
  ) {
    this.logger.log('Received GHL event request', {
      eventType: body.eventType,
      hasEmail: !!body.contactData?.email,
      hasMetadata: !!body.metadata,
      unitId: body.metadata?.unitId,
    });

    const result = await this.ghlContactService.handleUserEvent(
      body.eventType,
      body.contactData,
      body.metadata,
    );

    if (!result) {
      return {
        success: false,
        message: 'Failed to handle event (GHL integration may not be active)',
      };
    }

    return {
      success: true,
      data: {
        contactId: result.contactId,
        tagsAdded: result.tagsAdded,
      },
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get contacts list from GHL' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of contacts to return' })
  @ApiQuery({ name: 'startAfter', required: false, description: 'Pagination cursor' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async getContacts(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('startAfter') startAfter?: string,
  ) {
    const params: any = {};
    if (limit) params.limit = parseInt(limit, 10);
    if (startAfter) params.startAfter = startAfter;

    const contacts = await this.ghlContactService.getContacts(params, user.id);

    return {
      success: true,
      data: contacts,
    };
  }

  @Get(':contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get contact by ID from GHL' })
  @ApiParam({ name: 'contactId', description: 'GHL Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  async getContact(@CurrentUser() user: any, @Param('contactId') contactId: string) {
    const contact = await this.ghlContactService.getContact(contactId, user.id);

    return {
      success: true,
      data: {
        contact,
      },
    };
  }

  @Put(':contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update contact in GHL' })
  @ApiParam({ name: 'contactId', description: 'GHL Contact ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  async updateContact(
    @CurrentUser() user: any,
    @Param('contactId') contactId: string,
    @Body() contactData: any,
  ) {
    const contact = await this.ghlContactService.updateContact(contactId, contactData, user.id);

    return {
      success: true,
      data: {
        contact,
      },
    };
  }

  @Delete(':contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete contact from GHL' })
  @ApiParam({ name: 'contactId', description: 'GHL Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  async deleteContact(@CurrentUser() user: any, @Param('contactId') contactId: string) {
    await this.ghlContactService.deleteContact(contactId, user.id);

    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }

  @Post(':contactId/tags')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add tags to contact in GHL' })
  @ApiParam({ name: 'contactId', description: 'GHL Contact ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['DD.Signup', 'DD.Shortlisted'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  async addTags(
    @CurrentUser() user: any,
    @Param('contactId') contactId: string,
    @Body() body: { tags: string[] },
  ) {
    await this.ghlContactService.addTagsToContact(contactId, body.tags, user.id);

    return {
      success: true,
      message: 'Tags added successfully',
    };
  }

  // ============================================================
  // ENQUIRY ENDPOINT (public, no auth required)
  // ============================================================

  @Post('enquiry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit an enquiry (public, no auth required)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'phone', 'inquiryType'],
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        property: { type: 'string' },
        inquiryType: { type: 'string', enum: ['General Inquiry', 'Private Viewing', 'Investment Opportunity', 'Early Access Reservation'] },
        message: { type: 'string' },
        contactViaWhatsApp: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Enquiry submitted successfully' })
  async submitEnquiry(
    @Body() body: {
      fullName: string;
      email: string;
      phone: string;
      property?: string;
      inquiryType: string;
      message?: string;
      contactViaWhatsApp?: boolean;
    },
  ) {
    this.logger.log(`📩 Enquiry from ${body.fullName} (${body.email}) — ${body.inquiryType}`);

    // 1. Admin notification email
    try {
      await this.emailService.sendEnquiryAdminNotification(body);
    } catch (error) {
      this.logger.error('❌ Failed to send admin notification:', error);
    }

    // 2. User confirmation email
    try {
      await this.emailService.sendEnquiryConfirmation(body);
    } catch (error) {
      this.logger.error('❌ Failed to send confirmation email:', error);
    }

    // 3. GHL contact upsert + tag
    try {
      const nameParts = body.fullName.trim().split(/\s+/);
      await this.ghlContactService.handleUserEvent(
        'enquiry',
        { email: body.email, phone: body.phone, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' },
        { property: body.property, inquiryType: body.inquiryType },
      );
    } catch (error) {
      this.logger.error('❌ Failed to upsert GHL contact:', error);
    }

    return {
      success: true,
      message: 'Your enquiry has been received. Our team will contact you within 24 hours.',
    };
  }
}
