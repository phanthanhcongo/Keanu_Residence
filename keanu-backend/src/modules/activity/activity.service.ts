import { Injectable } from '@nestjs/common';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LogVisitDto } from './dto/log-visit.dto';

interface LogVisitParams extends LogVisitDto {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly prisma: PrismaService,
  ) {}

  async logVisit(params: LogVisitParams) {
    if (!params.userId) {
      // Skip logging if no user ID
      return { success: false, message: 'User ID required' };
    }

    try {
      await this.activityLogService.createActivityLog({
        userId: params.userId,
        action: params.action,
        entity: params.entity || 'Page',
        entityId: params.entityId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to log visit:', error);
      return { success: false, message: 'Failed to log visit' };
    }
  }

  async logVisitAnonymous(params: Omit<LogVisitParams, 'userId'>) {
    // For anonymous visits, we'll try to find or create a system user
    // First, try to find a system user for anonymous visits
    try {
      const systemUser = await this.findOrCreateSystemUser();
      
      if (systemUser) {
        return this.logVisit({
          ...params,
          userId: systemUser.id,
        });
      }
    } catch (error) {
      console.error('Failed to log anonymous visit:', error);
    }
    
    return { success: false, message: 'Failed to log anonymous visit' };
  }

  private async findOrCreateSystemUser() {
    // Try to find a system user for anonymous visits
    // We'll use a special email pattern to identify system users
    try {
      let systemUser = await this.prisma.user.findFirst({
        where: {
          email: 'system@anonymous.visits',
          isDeleted: false,
        },
      });

      if (!systemUser) {
        // Create system user for anonymous visits
        systemUser = await this.prisma.user.create({
          data: {
            email: 'system@anonymous.visits',
            phoneNumber: '+84900000000',
            firstName: 'System',
            lastName: 'Anonymous',
            role: 'BUYER',
            isVerified: true,
          },
        });
      }

      return systemUser;
    } catch (error) {
      console.error('Failed to find or create system user:', error);
      return null;
    }
  }
}

