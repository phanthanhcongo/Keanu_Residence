import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/services/prisma.service';
import { GHLOAuthService } from '../ghl-oauth.service';
import { GHLApiClient } from '../providers/ghl-api-client';

const logger = new Logger('GHLTagUtils');

/**
 * GHL Tag Assignment Utility
 * 
 * Reusable utility functions for adding tags to GHL contacts.
 * Automatically handles GHL client creation and error handling.
 */

export interface AddTagsOptions {
  contactId: string;
  tags: string[];
  adminUserId?: string; // Optional: if not provided, will use active integration
  skipIfNoIntegration?: boolean; // If true, skip silently if no integration found
}

export interface AddTagsResult {
  success: boolean;
  contactId: string;
  tags: string[];
  error?: string;
}

/**
 * Add tags to a GHL contact
 * 
 * @param prisma - PrismaService instance
 * @param ghlOAuthService - GHLOAuthService instance
 * @param options - AddTagsOptions with contactId, tags, and optional adminUserId
 * @returns Promise<AddTagsResult>
 * 
 * @example
 * ```typescript
 * const result = await addTagsToGHLContact(prisma, ghlOAuthService, {
 *   contactId: 'contact-123',
 *   tags: ['DD.Signup', 'DD.Shortlisted'],
 * });
 * ```
 */
export async function addTagsToGHLContact(
  prisma: PrismaService,
  ghlOAuthService: GHLOAuthService,
  options: AddTagsOptions,
): Promise<AddTagsResult> {
  const { contactId, tags, adminUserId, skipIfNoIntegration = false } = options;

  // Validate inputs
  if (!contactId) {
    logger.warn('Cannot add tags: contactId is required');
    return {
      success: false,
      contactId: '',
      tags,
      error: 'contactId is required',
    };
  }

  if (!tags || tags.length === 0) {
    logger.warn('Cannot add tags: tags array is empty', { contactId });
    return {
      success: false,
      contactId,
      tags: [],
      error: 'tags array is empty',
    };
  }

  try {
    // Get adminUserId from active integration if not provided
    let userId = adminUserId;
    if (!userId) {
      const integration = await prisma.integration.findFirst({
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
        if (skipIfNoIntegration) {
          logger.debug('No active GHL integration found, skipping tag assignment', { contactId, tags });
          return {
            success: false,
            contactId,
            tags,
            error: 'No active GHL integration found',
          };
        }
        logger.warn('No active GHL integration found, cannot add tags', { contactId, tags });
        return {
          success: false,
          contactId,
          tags,
          error: 'No active GHL integration found',
        };
      }

      userId = integration.userId || '';
    }

    if (!userId) {
      logger.warn('Cannot add tags: adminUserId is required', { contactId, tags });
      return {
        success: false,
        contactId,
        tags,
        error: 'adminUserId is required',
      };
    }

    // Create GHL client
    const { client } = await ghlOAuthService.createGHLClient(userId);

    // Add tags
    logger.log('Adding tags to GHL contact', {
      contactId,
      tags,
      tagsCount: tags.length,
      adminUserId: userId,
    });

    await client.addTags(contactId, tags);

    // logger.log('Successfully added tags to GHL contact', {
    //   contactId,
    //   tags,
    //   tagsCount: tags.length,
    //   adminUserId: userId,
    // });

    return {
      success: true,
      contactId,
      tags,
    };
  } catch (error: any) {
    logger.error('Failed to add tags to GHL contact', {
      contactId,
      tags,
      error: error.message,
      status: error.response?.status,
      details: error.response?.data,
    });

    return {
      success: false,
      contactId,
      tags,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Add tags to multiple GHL contacts (batch operation)
 * 
 * @param prisma - PrismaService instance
 * @param ghlOAuthService - GHLOAuthService instance
 * @param contacts - Array of { contactId, tags }
 * @param adminUserId - Optional admin user ID
 * @returns Promise<AddTagsResult[]>
 * 
 * @example
 * ```typescript
 * const results = await addTagsToMultipleGHLContacts(prisma, ghlOAuthService, [
 *   { contactId: 'contact-1', tags: ['DD.Signup'] },
 *   { contactId: 'contact-2', tags: ['DD.Shortlisted'] },
 * ]);
 * ```
 */
export async function addTagsToMultipleGHLContacts(
  prisma: PrismaService,
  ghlOAuthService: GHLOAuthService,
  contacts: Array<{ contactId: string; tags: string[] }>,
  adminUserId?: string,
): Promise<AddTagsResult[]> {
  const results: AddTagsResult[] = [];

  // Process sequentially to avoid rate limiting
  for (const contact of contacts) {
    const result = await addTagsToGHLContact(prisma, ghlOAuthService, {
      contactId: contact.contactId,
      tags: contact.tags,
      adminUserId,
    });
    results.push(result);
  }

  return results;
}

