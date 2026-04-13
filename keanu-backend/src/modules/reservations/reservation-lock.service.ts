import { Injectable, Logger, Inject } from '@nestjs/common';
import { throwError } from 'src/common/utils/error.utils';
import { PrismaService } from 'src/common/services/prisma.service';
import Redis from 'ioredis';

interface UnitLock {
  userId: string;
  reservationId: string;
  lockedAt: Date;
  expiresAt: Date;
}

interface LockQueueEntry {
  userId: string;
  timestamp: Date;
}

@Injectable()
export class ReservationLockService {
  private readonly logger = new Logger(ReservationLockService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) { }

  /**
   * Attempt to lock a unit for reservation — ATOMIC using Redis SET NX EX
   * Returns the lock info if successful, throws if already locked
   */
  async lockUnit(
    unitId: string,
    userId: string,
    reservationId: string,
    durationMinutes: number = 10,
  ): Promise<UnitLock> {
    const lockKey = `lock:unit:${unitId}`;
    const lockedAt = new Date();
    const expiresAt = new Date(lockedAt.getTime() + durationMinutes * 60 * 1000);
    const ttlSeconds = durationMinutes * 60;

    const lockValue = JSON.stringify({
      userId,
      reservationId,
      lockedAt,
      expiresAt,
    });

    // Atomic SET NX EX — sets only if key does NOT exist
    const result = await this.redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');

    if (result === 'OK') {
      // Successfully acquired the lock
      this.logger.log(`Unit ${unitId} locked by user ${userId} for ${durationMinutes} minutes (atomic)`);
      return { userId, reservationId, lockedAt, expiresAt };
    }

    // Lock already exists — check if same user (allow extend)
    const existingRaw = await this.redis.get(lockKey);
    if (existingRaw) {
      try {
        const existing: UnitLock = JSON.parse(existingRaw);
        if (existing.userId === userId) {
          // Same user — extend lock
          const extendedLock: UnitLock = {
            userId,
            reservationId: existing.reservationId,
            lockedAt: new Date(existing.lockedAt),
            expiresAt,
          };
          await this.redis.set(lockKey, JSON.stringify(extendedLock), 'EX', ttlSeconds);
          this.logger.log(`Extended lock for unit ${unitId} by same user ${userId}`);
          return extendedLock;
        }
      } catch {
        // corrupted data — remove and fail
        await this.redis.del(lockKey);
      }
    }

    this.logger.warn(`Unit ${unitId} is locked by another user, requested by ${userId}`);
    throwError('UNIT_ALREADY_LOCKED', 'Unit is currently locked by another user');
  }

  /**
   * Release a unit lock — uses Lua script for safe unlock
   * Only deletes if the lock belongs to the given user (or admin)
   */
  async unlockUnit(unitId: string, userId: string): Promise<boolean> {
    const lockKey = `lock:unit:${unitId}`;

    if (userId === 'admin') {
      // Admin can always unlock
      await this.redis.del(lockKey);
      this.logger.log(`Unit ${unitId} force-unlocked by admin`);
    } else {
      // Lua script: only delete if userId matches (atomic check-and-delete)
      const luaScript = `
        local data = redis.call('GET', KEYS[1])
        if not data then return 0 end
        local lock = cjson.decode(data)
        if lock.userId == ARGV[1] then
          redis.call('DEL', KEYS[1])
          return 1
        end
        return -1
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey, userId) as number;

      if (result === -1) {
        this.logger.warn(`User ${userId} attempted to unlock unit ${unitId} locked by another user`);
        throwError('UNIT_ALREADY_LOCKED', 'Cannot unlock unit locked by another user');
      }

      if (result === 0) {
        this.logger.warn(`Attempted to unlock unit ${unitId} but no lock exists in Redis`);
      }
    }

    // Ensure DB consistency — set unit back to AVAILABLE if still LOCKED
    try {
      const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });

      if (unit?.status === 'LOCKED') {
        // Check if there is any expired reservation still holding this unit
        const expiredReservation = await this.prisma.reservation.findFirst({
          where: {
            unitId,
            status: 'PENDING',
            expiresAt: { lt: new Date() },
          },
        });

        if (expiredReservation) {
          await this.prisma.reservation.update({
            where: { id: expiredReservation.id },
            data: { status: 'EXPIRED' },
          });
          this.logger.log(`Reservation ${expiredReservation.id} expired due to unlock`);
        }

        await this.prisma.unit.update({
          where: { id: unitId },
          data: { status: 'AVAILABLE' },
        });
        this.logger.log(`Unit ${unitId} set back to AVAILABLE`);
      }
    } catch (error) {
      this.logger.error(`Failed to update unit ${unitId} status:`, error);
    }

    // Process waiting queue
    await this.processLockQueue(unitId);

    return true;
  }

  /**
   * Get current lock status for a unit
   */
  async getUnitLock(unitId: string): Promise<UnitLock | null> {
    const lockKey = `lock:unit:${unitId}`;
    const lockData = await this.redis.get(lockKey);

    if (!lockData) return null;

    try {
      const lock: UnitLock = JSON.parse(lockData);
      return lock;
    } catch {
      await this.redis.del(lockKey);
      return null;
    }
  }

  /**
   * Check if unit is available for locking
   */
  async isUnitAvailable(unitId: string): Promise<boolean> {
    const lockKey = `lock:unit:${unitId}`;
    const exists = await this.redis.exists(lockKey);
    return exists === 0;
  }

  /**
   * Get time remaining for a lock
   */
  async getLockTimeRemaining(unitId: string): Promise<number> {
    const lockKey = `lock:unit:${unitId}`;
    const ttl = await this.redis.ttl(lockKey);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * Add user to waiting queue for a locked unit
   */
  async addToLockQueue(unitId: string, userId: string): Promise<number> {
    const queueKey = `queue:unit:${unitId}`;
    const queueData = await this.redis.get(queueKey);

    let queue: LockQueueEntry[] = queueData ? JSON.parse(queueData) : [];

    const existingIndex = queue.findIndex((entry) => entry.userId === userId);
    if (existingIndex >= 0) {
      queue[existingIndex].timestamp = new Date();
    } else {
      queue.push({ userId, timestamp: new Date() });
    }

    queue.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    await this.redis.set(queueKey, JSON.stringify(queue), 'EX', 3600);

    const position = queue.findIndex((entry) => entry.userId === userId) + 1;
    this.logger.log(`User ${userId} added to queue for unit ${unitId}, position: ${position}`);

    return position;
  }

  /**
   * Process lock queue when unit becomes available
   */
  private async processLockQueue(unitId: string): Promise<void> {
    const queueKey = `queue:unit:${unitId}`;
    const queueData = await this.redis.get(queueKey);

    if (!queueData) return;

    const queue: LockQueueEntry[] = JSON.parse(queueData);

    if (queue.length === 0) {
      await this.redis.del(queueKey);
      return;
    }

    const nextUser = queue[0];
    this.logger.log(`Unit ${unitId} is now available for user ${nextUser.userId}`);
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    // Redis TTL handles expiry automatically
    this.logger.log('Redis TTL handles lock expiry automatically');
    return 0;
  }

  /**
   * Get queue position for a user
   */
  async getQueuePosition(unitId: string, userId: string): Promise<number | null> {
    const queueKey = `queue:unit:${unitId}`;
    const queueData = await this.redis.get(queueKey);

    if (!queueData) return null;

    const queue: LockQueueEntry[] = JSON.parse(queueData);
    const position = queue.findIndex((entry) => entry.userId === userId);

    return position >= 0 ? position + 1 : null;
  }
}
