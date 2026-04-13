import { Injectable, NotFoundException, ConflictException, Logger, Optional } from '@nestjs/common';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { PrismaService } from '../../common/services/prisma.service';
import { throwError } from '../../common/utils/error.utils';
import { ShortlistItemDto, ShortlistResponseDto } from './dto/shortlist.dto';
import { GHLContactService } from '../integrations/ghl/ghl-contact.service';

@Injectable()
export class ShortlistService {
  private readonly logger = new Logger(ShortlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    @Optional() private readonly ghlContactService?: GHLContactService,
  ) { }

  /**
   * Add unit to user's shortlist
   * Allows units with any status (AVAILABLE, UNAVAILABLE, SOLD, etc.)
   */
  async addToShortlist(userId: string, unitId: string): Promise<ShortlistItemDto> {
    // this.logger.log(`Adding unit ${unitId} to shortlist for user ${userId}`);

    // Check if unit exists
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            developer: true,
            location: true,
          },
        },
      },
    });

    if (!unit) {
      throwError('UNIT_NOT_AVAILABLE', 'Unit not found');
    }

    // Allow all units to be shortlisted regardless of status
    // Removed constraint: Previously only AVAILABLE units could be shortlisted

    // Check if already in shortlist
    const existing = await this.prisma.shortlist.findUnique({
      where: {
        userId_unitId: {
          userId,
          unitId,
        },
      },
    });

    if (existing) {
      throwError('VALIDATION_ERROR', 'Unit is already in your shortlist');
    }

    // Add to shortlist and increment unit shortlistCount in a transaction
    const shortlistItem = await this.prisma.$transaction(async (tx) => {
      const item = await tx.shortlist.create({
        data: {
          userId,
          unitId,
        },
        include: {
          unit: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  developer: true,
                  location: true,
                },
              },
            },
          },
        },
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { shortlistCount: { increment: 1 } },
      });

      return item;
    });

    // Log shortlist add activity
    this.activityLogService.createActivityLog({
      userId,
      action: 'SHORTLIST_ADD',
      entity: 'Unit',
      entityId: unitId,
      metadata: { unitNumber: shortlistItem.unit?.unitNumber },
    }).catch(err => console.error('Failed to log shortlist add activity:', err));

    // Upsert GHL contact and add tags (async, non-blocking)
    if (this.ghlContactService) {
      // Get user data for GHL
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      });

      if (user && user.email) {
        // Use unitNumber from shortlistItem (already loaded) or fallback to unitId
        const unitIdentifier = shortlistItem.unit?.unitNumber || unitId;

        // this.logger.log('Upserting GHL contact for shortlist event', {
        //   userId,
        //   unitId,
        //   unitNumber: shortlistItem.unit?.unitNumber,
        //   unitIdentifier,
        // });

        this.ghlContactService
          .upsertContactFromUser(
            userId,
            {
              email: user.email,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              phoneNumber: user.phoneNumber || undefined,
            },
            'shortlist',
            { unitId: unitIdentifier },
          )
          .catch((error) => {
            this.logger.error('Failed to upsert GHL contact after shortlist', {
              userId,
              unitId,
              unitIdentifier,
              error: error.message,
            });
          });
      }
    }

    return this.mapToDto(shortlistItem);
  }

  /**
   * Remove unit from user's shortlist
   */
  async removeFromShortlist(userId: string, unitId: string): Promise<{ message: string }> {
    // this.logger.log(`Removing unit ${unitId} from shortlist for user ${userId}`);

    const shortlistItem = await this.prisma.shortlist.findUnique({
      where: {
        userId_unitId: {
          userId,
          unitId,
        },
      },
    });

    if (!shortlistItem) {
      throwError('VALIDATION_ERROR', 'Unit is not in your shortlist');
    }

    // Remove from shortlist and decrement unit shortlistCount in a transaction
    await this.prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({
        where: { id: unitId },
        select: { shortlistCount: true },
      });

      await tx.shortlist.delete({
        where: {
          userId_unitId: {
            userId,
            unitId,
          },
        },
      });

      // Only decrement if greater than 0
      if (unit && unit.shortlistCount > 0) {
        await tx.unit.update({
          where: { id: unitId },
          data: { shortlistCount: { decrement: 1 } },
        });
      }
    });

    // Log shortlist remove activity
    this.activityLogService.createActivityLog({
      userId,
      action: 'SHORTLIST_REMOVE',
      entity: 'Unit',
      entityId: unitId,
    }).catch(err => console.error('Failed to log shortlist remove activity:', err));

    return { message: 'Unit removed from shortlist successfully' };
  }

  /**
   * Get user's shortlist
   */
  async getShortlist(userId: string): Promise<ShortlistResponseDto> {
    // this.logger.log(`Getting shortlist for user ${userId}`);

    const shortlistItems = await this.prisma.shortlist.findMany({
      where: { userId },
      include: {
        unit: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                developer: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: shortlistItems.map((item) => this.mapToDto(item)),
      total: shortlistItems.length,
    };
  }

  /**
   * Clear user's shortlist (remove all items)
   */
  async clearShortlist(userId: string): Promise<{ message: string }> {
    // this.logger.log(`Clearing shortlist for user ${userId}`);

    // Get all unit IDs in user's shortlist before deleting
    const shortlistItems = await this.prisma.shortlist.findMany({
      where: { userId },
      select: { unitId: true },
    });

    if (shortlistItems.length === 0) {
      return { message: 'Shortlist is already empty' };
    }

    const unitIds = shortlistItems.map((item) => item.unitId);

    // Perform deletion and decrement counts in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete all shortlist items for the user
      await tx.shortlist.deleteMany({
        where: { userId },
      });

      // Decrement shortlistCount for each unit
      // We can use updateMany if we want to be efficient, but Prisma doesn't support 
      // relative increments in updateMany yet (it's being discussed/implemented in some versions)
      // So we'll update them individually or use a raw query if performance is an issue.
      // For a user's shortlist, the number of items is usually small.
      for (const unitId of unitIds) {
        const unit = await tx.unit.findUnique({
          where: { id: unitId },
          select: { shortlistCount: true },
        });

        if (unit && unit.shortlistCount > 0) {
          await tx.unit.update({
            where: { id: unitId },
            data: { shortlistCount: { decrement: 1 } },
          });
        }
      }
    });

    return { message: 'Shortlist cleared successfully' };
  }

  /**
   * Check if unit is in user's shortlist
   */
  async isInShortlist(userId: string, unitId: string): Promise<boolean> {
    const shortlistItem = await this.prisma.shortlist.findUnique({
      where: {
        userId_unitId: {
          userId,
          unitId,
        },
      },
    });

    return !!shortlistItem;
  }

  /**
   * Get all users who have shortlisted a specific unit
   * Used for sending notifications when unit is reserved
   */
  async getUsersWhoShortlistedUnit(unitId: string): Promise<{
    userId: string;
    userEmail: string;
    userName: string;
    unitNumber: string;
    unitType: string;
    projectName: string;
  }[]> {
    // this.logger.log(`Getting users who shortlisted unit ${unitId}`);

    const shortlistItems = await this.prisma.shortlist.findMany({
      where: { unitId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            unitNumber: true,
            unitType: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return shortlistItems
      .filter((item) => item.user.email) // Only include users with email
      .map((item) => ({
        userId: item.user.id,
        userEmail: item.user.email!,
        userName: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || 'Valued Client',
        unitNumber: item.unit.unitNumber,
        unitType: item.unit.unitType,
        projectName: item.unit.project.name,
      }));
  }

  /**
   * Map Prisma shortlist to DTO
   */
  private mapToDto(item: any): ShortlistItemDto {
    return {
      id: item.id,
      unitId: item.unitId,
      createdAt: item.createdAt,
      unit: {
        id: item.unit.id,
        unitNumber: item.unit.unitNumber,
        unitType: item.unit.unitType,
        floor: item.unit.floor,
        size: item.unit.size.toNumber(),
        bedrooms: item.unit.bedrooms,
        bathrooms: item.unit.bathrooms.toNumber(),
        price: item.unit.price.toNumber(),
        launchPrice: item.unit.launchPrice ? item.unit.launchPrice.toNumber() : null,
        status: item.unit.status,
        description: item.unit.description,
        floorPlanUrl: item.unit.floorPlanUrl,
        imageUrls: item.unit.imageUrls,
        features: item.unit.features,
        project: {
          id: item.unit.project.id,
          name: item.unit.project.name,
          slug: item.unit.project.slug,
          developer: item.unit.project.developer,
          location: item.unit.project.location,
        },
      },
    };
  }
}

