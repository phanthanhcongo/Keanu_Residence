import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface CreateActivityLogDto {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) { }

  async createActivityLog(dto: CreateActivityLogDto) {
    try {
      // Fetch user info to include in metadata for easy identification in admin panel
      let userInfo: { name: string; email: string; phone: string; isAnonymous: boolean } | null = null;

      if (dto.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: { firstName: true, lastName: true, email: true, phoneNumber: true }
        });

        if (user) {
          // Check if this is the system anonymous user
          const isAnonymousUser = user.email === 'system@anonymous.visits';

          // Check if this is a seed/test user (known test email domains)
          const testEmailDomains = ['@keanu.com', '@example.com'];
          const isTestUser = user.email ? testEmailDomains.some(domain => user.email!.endsWith(domain)) : false;

          if (isAnonymousUser) {
            userInfo = {
              name: 'Anonymous',
              email: 'Anonymous',
              phone: 'Anonymous',
              isAnonymous: true,
            };
          } else {
            userInfo = {
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
              email: user.email || 'N/A',
              phone: user.phoneNumber || 'N/A',
              isAnonymous: false,
            };
          }
        }
      }

      const activityLog = await this.prisma.activityLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          entity: dto.entity,
          entityId: dto.entityId,
          metadata: {
            ...(dto.metadata || {}),
            userInfo: userInfo || { name: 'Unknown', email: 'Unknown', phone: 'Unknown', isAnonymous: true },
          },
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });

      // Update user activity for online tracking
      // Only track user interactions, not admin actions
      // Note: LOGIN is excluded because it's already handled in auth.service.ts (markUserOnline)
      const userInteractionActions = [
        'EXPLORE_PAGE_VIEW',
        'HOME_PAGE_VIEW',
        'UNIT_VIEW',
        'PROJECT_VIEW',
        'PAGE_VIEW',
        'SEARCH',
        'SHORTLISTED_UNIT',
        'RESERVED_UNIT',
        'FILTER_UNIT',
        'CONTACT_AGENT_VIEW',
        'MAIN_WEBSITE_VIEW',
        "BROCHURE_VIEW",
        "SHORTLIST_VIEW",
        "PROFILE_VIEW",
        "RESERVATION_VIEW",
        "CONTACT_US_VIEW",
        "LOGIN",
        "SHORTLIST_ADD",
        "SHORTLIST_REMOVE",
        "RESERVATION_ATTEMPT",
        "PAYMENT_SUCCESS",
        "PAYMENT_FAILURE",
        // 'LOGIN' removed - already handled in auth.service.ts to avoid double counting
      ];

      if (userInteractionActions.includes(dto.action)) {
        try {
          // Use require to avoid circular dependency and TypeScript module resolution issues
          // This is safe because AdminService is a static class with static methods
          const AdminServiceModule = require('../../modules/admin/admin.service');
          const AdminService = AdminServiceModule.AdminService;
          if (AdminService && typeof AdminService.updateUserActivity === 'function') {
            AdminService.updateUserActivity(dto.userId);
          }
        } catch (error) {
          // Don't fail activity logging if online tracking fails
          console.error('Failed to update user activity for online tracking:', error);
        }
      }

      return activityLog;
    } catch (error) {
      // Don't throw error if logging fails, just log to console
      console.error('Failed to create activity log:', error);
      return null;
    }
  }
}

