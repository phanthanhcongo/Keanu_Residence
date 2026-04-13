import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class UserManipulationService {
  private readonly logger = new Logger(UserManipulationService.name);

  // Cached values to reduce DB hits (aligned with 2-second milestones)
  private cachedDelta = 0;
  private cachedMilestone: Date | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 2000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get delta for the current server time.
   * Uses second-precision query with a short cache.
   */
  async getCurrentDelta(): Promise<number> {
    const now = Date.now();

    // Serve cached value when valid
    if (now < this.cacheExpiry && this.cachedMilestone) {
      return this.cachedDelta;
    }

    try {
      // Latest milestone at or before now
      const result = await this.prisma.userManipulation.findFirst({
        where: {
          milestone: {
            lte: new Date(),
          },
        },
        orderBy: {
          milestone: 'desc',
        },
      });

      if (result) {
        this.cachedDelta = result.delta;
        this.cachedMilestone = result.milestone;
        this.logger.log(`Using manipulation delta: ${result.delta} (milestone: ${result.milestone.toISOString()})`);
      } else {
        // Outside manipulation window - show real users only
        this.cachedDelta = 0;
        this.cachedMilestone = null;
        this.logger.log('Outside manipulation window - delta set to 0, showing real user count only');
      }

      this.cacheExpiry = now + this.CACHE_TTL_MS;
      return this.cachedDelta;
    } catch (error) {
      this.logger.error('Error fetching user manipulation delta', error);
      // Fallback to cached value on error
      return this.cachedDelta;
    }
  }

  /**
   * Debug info for visibility.
   */
  async getDebugInfo() {
    const delta = await this.getCurrentDelta();
    return {
      currentDelta: delta,
      lastMilestone: this.cachedMilestone,
      cacheExpiry: new Date(this.cacheExpiry),
    };
  }
}
