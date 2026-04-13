import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/exceptions/app-error';
import { GHLOAuthService } from './ghl-oauth.service';
import { getCountryCode } from '../../../common/utils/country-code';
import { addTagsToGHLContact } from './utils/ghl-tag.utils';
import { GHLApiClient } from './providers/ghl-api-client';

export type GHLEventType = 'signup' | 'completedProfile' | 'shortlist' | 'enquiry' | 'reserve' | 'deposit' | 'login' | 'buying_to_live' | 'buying_as_investment' | 'buying_for_holiday' | 'not_a_buyer' | 'payment' | 'reservation';

@Injectable()
export class GHLContactService {
  private readonly logger = new Logger(GHLContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghlOAuthService: GHLOAuthService,
  ) { }

  /**
   * Upsert contact in GHL (create or update)
   * Called after registration or profile update
   * @param eventTypes Optional event types to add tags (signup, completedProfile, login, etc.)
   * @param eventType Deprecated: Use eventTypes instead. Kept for backward compatibility
   */
  async upsertContactFromUser(
    userId: string,
    userData?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      gender?: string;
      address?: string;
      city?: string;
      country?: string;
      interest?: string;
    },
    eventTypes?: GHLEventType | GHLEventType[],
    metadata?: { unitId?: string;[key: string]: any },
  ): Promise<string | null> {
    try {
      // Get active GHL integration (admin's integration)
      const integration = await this.prisma.integration.findFirst({
        where: {
          providerName: 'ghl',
          status: 'active',
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc', // Get the most recent active integration
        },
      });

      if (!integration) {
        this.logger.debug('No active GHL integration found, skipping contact upsert', { userId });
        return null;
      }

      // Get user data from database if not provided
      let fullUserData = userData;
      if (!fullUserData) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            city: true,
            country: true,
            interest: true,
            ghlContactId: true,
          },
        });

        if (!user) {
          this.logger.warn('User not found for GHL contact upsert', { userId });
          return null;
        }

        fullUserData = {
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          phoneNumber: user.phoneNumber || undefined,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : undefined,
          gender: user.gender || undefined,
          address: user.address || undefined,
          city: user.city || undefined,
          country: user.country || undefined,
          interest: user.interest || undefined,
        };
      }

      // Get GHL client and locationId (will auto-refresh token if expired)
      const { client, locationId } = await this.ghlOAuthService.createGHLClient(integration.userId || '');

      // Prepare contact data for GHL upsert API
      const contactData: any = {
        email: fullUserData.email,
        firstName: fullUserData.firstName || '',
        lastName: fullUserData.lastName || '',
        name: fullUserData.firstName && fullUserData.lastName
          ? `${fullUserData.firstName} ${fullUserData.lastName}`.trim()
          : fullUserData.firstName || fullUserData.lastName || '',
        phone: fullUserData.phoneNumber || '',
        locationId: locationId,
      };

      // Add optional fields
      if (fullUserData.gender) {
        contactData.gender = fullUserData.gender.toLowerCase();
      }

      if (fullUserData.address) {
        contactData.address1 = fullUserData.address;
      }

      if (fullUserData.city) {
        contactData.city = fullUserData.city;
      }

      if (fullUserData.country) {
        // Convert country name to ISO 3166-1 alpha-2 country code
        const countryCode = getCountryCode(fullUserData.country);
        if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
          // Only add country if we have a valid 2-letter uppercase code
          contactData.country = countryCode;
          this.logger.debug('Country converted to code for GHL contact', {
            userId,
            original: fullUserData.country,
            code: countryCode,
          });
        } else {
          // Omit country field if conversion fails or invalid format
          this.logger.warn('Could not convert country to valid code, omitting from GHL contact', {
            userId,
            country: fullUserData.country,
            attemptedCode: countryCode,
          });
        }
      }

      if (fullUserData.dateOfBirth) {
        contactData.dateOfBirth = fullUserData.dateOfBirth;
      }

      // Add custom fields
      const customFields: any[] = [];
      if (fullUserData.interest) {
        customFields.push({
          key: 'interest',
          field_value: fullUserData.interest,
        });
      }

      if (customFields.length > 0) {
        contactData.customFields = customFields;
      }

      // Upsert contact in GHL
      const ghlContact = await client.upsertContact(contactData);

      // Save GHL contact ID to user
      if (ghlContact?.id || ghlContact?.contact?.id) {
        const contactId = ghlContact?.id || ghlContact?.contact?.id;

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ghlContactId: contactId,
          },
        });

        // this.logger.log('GHL contact upserted successfully', {
        //   userId,
        //   ghlContactId: contactId,
        // });

        // Collect all tags to add
        const allTags: string[] = [];

        // Add tags from eventTypes if provided
        if (eventTypes) {
          // Normalize to array
          const eventTypesArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

          // Collect all tags from all event types
          for (const eventType of eventTypesArray) {
            const tags = this.getTagsForEvent(eventType, metadata);
            allTags.push(...tags);
          }
        }

        // Add country tag if country is present
        if (fullUserData.country) {
          const countryCode = getCountryCode(fullUserData.country);
          if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
            // Convert to lowercase for tag format (e.g., "au", "us", "uk", "vn")
            const countryTag = countryCode.toLowerCase();
            allTags.push(countryTag);
            this.logger.debug('Country tag added', {
              userId,
              contactId,
              country: fullUserData.country,
              countryCode,
              tag: countryTag,
            });
          }
        }

        // Remove duplicates and add all tags
        const uniqueTags = [...new Set(allTags)];

        if (uniqueTags.length > 0) {
          this.logger.log('Adding tags after upsert contact', {
            userId,
            contactId,
            tags: uniqueTags,
            tagsCount: uniqueTags.length,
          });

          // Use reusable utils function to add tags
          const tagResult = await addTagsToGHLContact(
            this.prisma,
            this.ghlOAuthService,
            {
              contactId,
              tags: uniqueTags,
              adminUserId: integration.userId || undefined,
              skipIfNoIntegration: false,
            },
          );

          if (!tagResult.success) {
            this.logger.error('Failed to add tags after upsert contact', {
              userId,
              contactId,
              tags: uniqueTags,
              error: tagResult.error,
            });
            // Continue even if tag addition fails - contact was upserted successfully
          }
        } else {
          this.logger.debug('No tags to add after upsert contact', { contactId });
        }

        return contactId;
      }

      return null;
    } catch (error: any) {
      this.logger.error('Failed to upsert GHL contact', {
        error: error.message,
        userId,
        details: error.response?.data,
      });
      // Don't throw error - contact upsert failure shouldn't block user operations
      return null;
    }
  }

  /**
   * Create contact in GHL when user registers (deprecated - use upsertContactFromUser)
   * @deprecated Use upsertContactFromUser instead
   */
  async createContactFromUser(userId: string, userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    interest?: string;
  }): Promise<string | null> {
    return this.upsertContactFromUser(userId, userData);
  }

  /**
   * Get contact from GHL
   */
  async getContact(contactId: string, adminUserId: string): Promise<any> {
    const { client } = await this.ghlOAuthService.createGHLClient(adminUserId);
    return await client.getContact(contactId);
  }

  /**
   * Update contact in GHL
   * Uses upsert API with contactId in data
   */
  async updateContact(contactId: string, contactData: any, adminUserId: string): Promise<any> {
    const { client } = await this.ghlOAuthService.createGHLClient(adminUserId);
    // Use upsert API with contactId - GHL will update existing contact
    return await client.upsertContact({
      ...contactData,
      id: contactId, // Include contactId to update existing contact
    });
  }

  /**
   * Delete contact from GHL
   */
  async deleteContact(contactId: string, adminUserId: string): Promise<void> {
    const { client } = await this.ghlOAuthService.createGHLClient(adminUserId);
    await client.deleteContact(contactId);
  }

  /**
   * Get contacts list
   */
  async getContacts(params: any, adminUserId: string): Promise<any> {
    const { client } = await this.ghlOAuthService.createGHLClient(adminUserId);
    return await client.getContacts(params);
  }

  /**
   * Add tags to contact
   * @deprecated Use addTagsToGHLContact from utils/ghl-tag.utils.ts instead
   */
  async addTagsToContact(contactId: string, tags: string[], adminUserId: string): Promise<void> {
    const result = await addTagsToGHLContact(
      this.prisma,
      this.ghlOAuthService,
      {
        contactId,
        tags,
        adminUserId,
        skipIfNoIntegration: false,
      },
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to add tags to GHL contact');
    }
  }

  /**
   * Handle user event: upsert contact + add tags
   * This is the main method to handle events from FE
   */
  async handleUserEvent(
    eventType: GHLEventType,
    contactData: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      [key: string]: any;
    },
    metadata?: {
      unitId?: string;
      [key: string]: any;
    },
  ): Promise<{ contactId: string; tagsAdded: string[] } | null> {
    try {
      // Get active GHL integration (admin's integration)
      const integration = await this.prisma.integration.findFirst({
        where: {
          providerName: 'ghl',
          status: 'active',
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!integration) {
        this.logger.debug('No active GHL OAuth integration found, checking for static API key...');
        const staticResult = await this.ghlOAuthService.createStaticClient();
        if (!staticResult) {
          this.logger.debug('No GHL integration or static key available, skipping event handling');
          return null;
        }

        // Use static client
        const { client, locationId } = staticResult;
        return this.processUserEvent(client, locationId, eventType, contactData, metadata);
      }

      // Get GHL client and locationId (OAuth)
      const { client, locationId } = await this.ghlOAuthService.createGHLClient(integration.userId || '');
      return this.processUserEvent(client, locationId, eventType, contactData, metadata);
    } catch (error: any) {
      this.logger.error('Failed to handle GHL user event', {
        error: error.message,
        eventType,
        details: error.response?.data,
      });
      return null;
    }
  }

  /**
   * Internal method to process event after client is created
   */
  private async processUserEvent(
    client: GHLApiClient,
    locationId: string,
    eventType: GHLEventType,
    contactData: any,
    metadata?: any,
  ): Promise<{ contactId: string; tagsAdded: string[] } | null> {
    try {
      // GHL API requires at least email or phone - validate before proceeding
      const email = contactData.email?.trim();
      const phone = (contactData.phone || contactData.phoneNumber)?.trim();

      if (!email && !phone) {
        this.logger.warn('Cannot upsert GHL contact: email and phone are both missing', {
          eventType,
          hasEmail: !!email,
          hasPhone: !!phone,
        });
        return null;
      }

      // Prepare contact data for upsert
      const upsertData: any = {
        email: email || undefined,
        phone: phone || undefined,
        firstName: contactData.firstName || '',
        lastName: contactData.lastName || '',
        name: contactData.firstName && contactData.lastName
          ? `${contactData.firstName} ${contactData.lastName}`.trim()
          : contactData.firstName || contactData.lastName || '',
        locationId: locationId,
      };

      // Add other fields if provided
      if (contactData.gender) {
        upsertData.gender = contactData.gender.toLowerCase();
      }
      if (contactData.address || contactData.address1) {
        upsertData.address1 = contactData.address || contactData.address1;
      }
      if (contactData.city) {
        upsertData.city = contactData.city;
      }
      if (contactData.country) {
        const countryCode = getCountryCode(contactData.country);
        if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
          upsertData.country = countryCode;
        }
      }
      if (contactData.dateOfBirth) {
        upsertData.dateOfBirth = contactData.dateOfBirth;
      }

      // Add custom fields if provided
      const customFields: any[] = [];
      if (contactData.interest) {
        customFields.push({
          key: 'interest',
          field_value: contactData.interest,
        });
      }
      if (metadata?.unitId) {
        customFields.push({
          key: 'unitId',
          field_value: metadata.unitId,
        });
      }
      if (customFields.length > 0) {
        upsertData.customFields = customFields;
      }

      // Step 1: Upsert contact
      this.logger.log('Upserting GHL contact for event', { eventType, email: contactData.email });
      const ghlContact = await client.upsertContact(upsertData);
      const contactId = ghlContact?.id || ghlContact?.contact?.id;

      if (!contactId) {
        this.logger.error('Failed to get contact ID from GHL upsert response', {
          eventType,
          ghlContact,
        });
        return null;
      }

      // Step 2: Map event type to tags
      const tags = this.getTagsForEvent(eventType, metadata);

      // Step 3: Add tags if any
      if (tags.length > 0) {
        try {
          await client.addTags(contactId, tags);
        } catch (error: any) {
          this.logger.error('Failed to add tags to GHL contact for event', {
            contactId,
            tags,
            eventType,
            error: error.message,
          });
        }
      }

      return {
        contactId,
        tagsAdded: tags,
      };
    } catch (error: any) {
      this.logger.error('Error in processUserEvent', { error: error.message });
      return null;
    }
  }

  /**
   * Map event type to tags
   */
  private getTagsForEvent(
    eventType: GHLEventType,
    metadata?: { unitId?: string;[key: string]: any },
  ): string[] {
    const tags: string[] = [];

    switch (eventType) {
      case 'signup':
        tags.push('DD.Signup');
        break;

      case 'completedProfile':
        tags.push('DD.completedProfile');
        break;

      case 'buying_to_live':
        tags.push('DD.Interest.BuyingToLive');
        break;

      case 'buying_as_investment':
        tags.push('DD.Interest.BuyingAsInvestment');
        break;

      case 'buying_for_holiday':
        tags.push('DD.Interest.BuyingForHoliday');
        break;

      case 'not_a_buyer':
        tags.push('DD.Interest.NotABuyer');
        break;

      case 'shortlist':
        tags.push('DD.Shortlisted');
        if (metadata?.unitId) {
          tags.push(`DD.Shortlist.${metadata.unitId}`);
        }
        break;

      case 'enquiry':
        tags.push('DD.Enquiry');
        if (metadata?.unitId) {
          tags.push(`DD.Enquire.${metadata.unitId}`);
        }
        break;

      case 'reserve':
        tags.push('DD.Reserved');
        break;

      case 'deposit':
        tags.push('DD.Deposit');
        break;

      case 'login':
        tags.push('DD.Login');
        break;

      case 'payment':
        tags.push('DD.Payment');
        if (metadata?.unitId) {
          tags.push(`DD.Payment.${metadata.unitId}`);
        }
        break;

      case 'reservation':
        tags.push('DD.Reservation');
        if (metadata?.unitId) {
          tags.push(`DD.Reservation.${metadata.unitId}`);
        }
        break;

      default:
        this.logger.warn('Unknown event type', { eventType });
    }

    // Add partner tag if referral source exists
    if (metadata?.referral) {
      const referralValue = metadata.referral;
      // If referral already starts with 'agency.', use as-is
      // Otherwise, prepend 'agency.'
      const tag = referralValue.startsWith('agency.')
        ? referralValue
        : `agency.${referralValue}`;
      tags.push(tag);
    }

    return tags;
  }
}

