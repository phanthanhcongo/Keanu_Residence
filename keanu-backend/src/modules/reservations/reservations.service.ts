import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { ActivityLogService } from 'src/common/services/activity-log.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from 'src/common/services/prisma.service';
import { ReservationLockService } from './reservation-lock.service';
import {
  CreateReservationDto,
  ReservationResponseDto,
  ReservationQueryDto,
  CreateReservationResponseDto
} from './dto/create-reservation.dto';
import {
  PaymentIntentDto,
  PaymentIntentResponseDto,
  ConfirmPaymentDto
} from './dto/confirm-payment.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { throwError } from 'src/common/utils/error.utils';
import { randomUUID } from 'crypto';
import { GHLContactService } from '../integrations/ghl/ghl-contact.service';
import { ReservationsGateway } from './reservations.gateway';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../notifications/email.service';
import { ShortlistService } from '../shortlist/shortlist.service';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: ReservationLockService,
    private readonly paymentsService: PaymentsService,
    @InjectQueue('reservation-expiry') private readonly expiryQueue: Queue,
    private readonly activityLogService: ActivityLogService,
    @Optional() @Inject(forwardRef(() => GHLContactService)) private readonly ghlContactService?: GHLContactService,
    @Optional() @Inject(EmailService) private readonly emailService?: EmailService,
    @Optional() private readonly reservationsGateway?: ReservationsGateway,
    @Optional() @Inject(forwardRef(() => ShortlistService)) private readonly shortlistService?: ShortlistService,
  ) { }


  toUUID(value: string): string {
    if (!/^[0-9a-fA-F-]{36}$/.test(value)) {
      throw new Error(`Invalid UUID format: ${value}`);
    }
    return value;
  }


  /**
   * Validate user profile has required information for reservation
   */
  private validateUserProfile(user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
  }): void {
    const missingFields: string[] = [];

    if (!user.firstName || !user.lastName) {
      missingFields.push('name (first name and last name)');
    }

    if (!user.email) {
      missingFields.push('email');
    }

    if (!user.phoneNumber) {
      missingFields.push('phone number');
    }

    if (missingFields.length > 0) {
      throwError(
        'PROFILE_INCOMPLETE',
        `Please complete your profile before making a reservation. Missing: ${missingFields.join(', ')}`,
      );
    }
  }

  /**
   * Create a new reservation (lock unit for 10 minutes)
   */
  async createReservation(userId: string, dto: CreateReservationDto): Promise<CreateReservationResponseDto> {
    this.logger.log(`Creating reservation for user ${userId}, unit ${dto.unitId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });


    if (!user) {
      throwError('USER_NOT_FOUND', 'User not found');
    }

    // Validate user profile has required information
    this.validateUserProfile(user);


    // Check if unit exists
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      include: { project: true }
    });

    if (!unit) {
      throwError('UNIT_NOT_AVAILABLE', 'Unit not found');
    }

    // Check if user already has any pending reservation
    const existingPendingReservation = await this.prisma.reservation.findFirst({
      where: {
        userId,
        status: 'PENDING',
        isDeleted: false
      }
    });

    if (existingPendingReservation) {
      throwError('PENDING_RESERVATION_EXISTS', 'You have a reservation that needs to be finished. You can view it in My Reservations.');
    }

    // ===== FIX 2: ATOMIC DB UPDATE =====
    // Atomically set unit status from AVAILABLE -> LOCKED
    // If another request already grabbed it, updateMany returns count = 0
    const lockResult = await this.prisma.unit.updateMany({
      where: {
        id: dto.unitId,
        status: 'AVAILABLE', // Only update if STILL available (atomic)
      },
      data: { status: 'LOCKED' },
    });

    if (lockResult.count === 0) {
      // Another request already locked/reserved this unit
      throwError('UNIT_NOT_AVAILABLE', 'Unit is not available for reservation');
    }

    const lockDuration = 10;
    const lockExpiry = new Date(Date.now() + lockDuration * 60 * 1000);
    const reservationId = randomUUID();

    // Set Redis lock (for distributed TTL tracking)
    await this.lockService.lockUnit(dto.unitId, userId, reservationId, lockDuration);

    try {

      // Use project's deposit amount, fallback to 1000 if not set
      const depositAmount = Number(unit.project?.depositAmount || 1000);

      // Create reservation
      const reservation = await this.prisma.reservation.create({
        data: {
          //id: reservationId,
          userId,
          buyerName: `${user.firstName} ${user.lastName}`.trim(),
          buyerEmail: user.email!,
          buyerPhone: user.phoneNumber!,
          unitId: unit.id,
          projectId: unit.projectId,
          status: ReservationStatus.PENDING,
          lockedAt: new Date(),
          expiresAt: lockExpiry,
          depositAmount: depositAmount as any,
          paymentStatus: 'PENDING'
        },
        include: {
          unit: {
            include: { project: true }
          },
          user: true
        }
      });

      // this.logger.log(`Reservation success create`);

      // Upsert GHL contact and add tags (async, non-blocking)
      if (this.ghlContactService) {
        this.ghlContactService
          .upsertContactFromUser(
            userId,
            {
              email: user.email || undefined,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              phoneNumber: user.phoneNumber || undefined,
            },
            'reserve',
            { unitId: unit.unitNumber || unit.id },
          )
          .catch((error) => {
            this.logger.error('Failed to upsert GHL contact after reservation', {
              userId,
              unitId: unit.id,
              error: error.message,
            });
          });
      }

      // Send reservation form started email (async, non-blocking)
      if (this.emailService && user.email && user.firstName) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const reservationLink = `${frontendUrl}/checkout/payment/${reservation.id}`;
        const unitName = reservation.unit.unitNumber || reservation.unit.unitType || 'your villa';

        this.emailService
          .sendReservationFormStartedEmail(
            user.email,
            user.firstName,
            unitName,
            reservationLink,
          )
          .catch((error) => {
            this.logger.error('Failed to send reservation form started email', {
              userId,
              reservationId: reservation.id,
              email: user.email,
              error: error.message,
            });
          });
      }

      // ===== FIX 3: BULL QUEUE FOR EXPIRY =====
      // Schedule auto-expiration via Bull (persisted in Redis, survives restarts)
      const expiryDelay = lockExpiry.getTime() - Date.now();
      await this.expiryQueue.add(
        'expire',
        { reservationId: reservation.id },
        { delay: expiryDelay, removeOnComplete: true, removeOnFail: false },
      );
      this.logger.log(`Scheduled Bull expiry job for reservation ${reservation.id} in ${Math.round(expiryDelay / 1000)}s`);

      // Schedule payment reminder email halfway through the time limit (or 1 minute before checking)
      // Original code used 5 minutes for a 10 minute lock. Let's do 50% of the duration.
      const reminderDelay = Math.floor(expiryDelay / 2);
      await this.expiryQueue.add(
        'payment-reminder',
        {
          reservationId: reservation.id,
          unitNumber: reservation.unit.unitNumber,
          depositAmount: Number(depositAmount)
        },
        { delay: reminderDelay, removeOnComplete: true, removeOnFail: false },
      );
      this.logger.log(`Scheduled Bull payment reminder job for reservation ${reservation.id} in ${Math.round(reminderDelay / 1000)}s`);

      // Emit WebSocket event to notify all clients that unit has been locked
      if (this.reservationsGateway) {
        this.reservationsGateway.emitUnitLocked(reservation.unitId, reservation.id);
      } else {
        this.logger.warn(`⚠️ ReservationsGateway not available - cannot emit unit locked event for unit ${reservation.unitId}`);
      }

      // Map to response DTO
      const reservationDto = this.mapToResponseDto(reservation);

      // Log reservation attempt activity
      this.activityLogService.createActivityLog({
        userId,
        action: 'RESERVATION_ATTEMPT',
        entity: 'Unit',
        entityId: dto.unitId,
        metadata: { reservationId: reservation.id },
      }).catch(err => console.error('Failed to log reservation attempt activity:', err));

      return {
        success: true,
        message: 'Reservation created successfully. You have 1 minute to complete payment.',
        data: reservationDto
      };
    } catch (error) {
      // Release lock if reservation creation failed
      await this.lockService.unlockUnit(dto.unitId, userId);
      throw error;
    }
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string, userId: string): Promise<ReservationResponseDto> {
    if (!reservationId) {
      throwError('VALIDATION_ERROR', 'Reservation ID is required');
    }

    if (!userId) {
      throwError('VALIDATION_ERROR', 'User ID is required');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId // Ensure user can only access their own reservations
      },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    if (!reservation) {
      throwError('RESERVATION_NOT_FOUND', 'This reservation no longer exists. It may have expired or been cancelled.');
    }

    try {
      return this.mapToResponseDto(reservation);
    } catch (error) {
      this.logger.error(`Error mapping reservation ${reservationId} to DTO:`, error);
      throwError('VALIDATION_ERROR', 'Failed to process reservation data');
    }
  }

  /**
   * List user's reservations with pagination
   */
  async listReservations(
    userId: string,
    query: ReservationQueryDto
  ): Promise<{ data: ReservationResponseDto[], total: number, page: number, limit: number }> {
    const {
      page = 1,
      limit = 10,
      status,
      projectId,
      sortBy = 'lockedAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          unit: {
            include: { project: true }
          },
          user: true
        }
      }),
      this.prisma.reservation.count({ where })
    ]);

    return {
      data: reservations.map(this.mapToResponseDto),
      total,
      page,
      limit
    };
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string, userId: string): Promise<ReservationResponseDto> {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId
      },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    if (!reservation) {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    if (reservation.status !== 'PENDING') {
      throwError('VALIDATION_ERROR', 'Only pending reservations can be cancelled');
    }

    // Update reservation status, payment status, and unit status
    const updatedReservation = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED,
        paymentStatus: 'FAILED'
      },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    // Release unit lock and set unit status to AVAILABLE
    await this.lockService.unlockUnit(reservation.unitId, userId);

    // Ensure unit status is set to AVAILABLE
    await this.prisma.unit.update({
      where: { id: reservation.unitId },
      data: { status: 'AVAILABLE' },
    });

    this.logger.log(`Reservation ${reservationId} cancelled by user ${userId}`);

    // Emit Socket.IO event for realtime updates
    if (this.reservationsGateway) {
      this.reservationsGateway.emitReservationCancelled(reservationId, reservation.unitId);
      this.reservationsGateway.emitUnitUnlocked(reservation.unitId);
    }

    return this.mapToResponseDto(updatedReservation);
  }

  /**
   * Confirm payment and finalize reservation
   */
  async confirmPayment(
    reservationId: string,
    dto: ConfirmPaymentDto
  ): Promise<ReservationResponseDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    if (!reservation) {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    if (reservation.paymentIntentId !== dto.paymentIntentId) {
      throwError('PAYMENT_FAILED', 'Invalid payment intent');
    }

    // TODO: Verify payment with payment service
    const isPaymentSuccessful = true; // Mock verification

    if (!isPaymentSuccessful) {
      throwError('PAYMENT_FAILED', 'Payment verification failed');
    }

    // Update reservation and unit status
    const [updatedReservation] = await Promise.all([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          paymentStatus: 'SUCCEEDED',
          confirmedAt: new Date()
        },
        include: {
          unit: {
            include: { project: true }
          },
          user: true
        }
      }),
      this.prisma.unit.update({
        where: { id: reservation.unitId },
        data: { status: 'RESERVED' }
      })
    ]);

    // Release the lock (no longer needed as unit is now reserved)
    await this.lockService.unlockUnit(reservation.unitId, reservation.userId);

    // Upsert GHL contact and add deposit tag (async, non-blocking)
    if (this.ghlContactService) {
      this.ghlContactService
        .upsertContactFromUser(
          reservation.userId,
          {
            email: reservation.user.email || undefined,
            firstName: reservation.user.firstName || undefined,
            lastName: reservation.user.lastName || undefined,
            phoneNumber: reservation.user.phoneNumber || undefined,
          },
          'deposit',
          { unitId: reservation.unit.unitNumber || reservation.unitId },
        )
        .catch((error) => {
          this.logger.error('Failed to upsert GHL contact after deposit', {
            userId: reservation.userId,
            reservationId,
            error: error.message,
          });
        });
    }

    // Send booking confirmation email (async, non-blocking)
    if (this.emailService && updatedReservation.confirmedAt) {
      const customerEmail = updatedReservation.buyerEmail || updatedReservation.user?.email;
      const customerName = updatedReservation.buyerName ||
        (updatedReservation.user?.firstName
          ? `${updatedReservation.user.firstName}${updatedReservation.user.lastName ? ` ${updatedReservation.user.lastName}` : ''}`
          : 'Valued Customer');

      if (customerEmail) {
        const villaName = updatedReservation.unit?.unitNumber || updatedReservation.unit?.unitType || 'Villa';
        const address = updatedReservation.unit?.project?.location || updatedReservation.unit?.project?.name || 'Bali, Indonesia';

        this.logger.log(`📧 Attempting to send booking confirmation email for reservation ${reservationId} to ${customerEmail}`);

        this.emailService
          .sendBookingConfirmationEmail(
            updatedReservation.id,
            customerName,
            customerEmail,
            villaName,
            address,
            updatedReservation.confirmedAt,
            updatedReservation.depositAmount,
          )
          .then(() => {
            // this.logger.log(`✅ Booking confirmation email sent successfully for reservation ${reservationId} to ${customerEmail}`);
          })
          .catch((error) => {
            this.logger.error(`❌ Failed to send booking confirmation email for reservation ${reservationId}`, {
              reservationId,
              customerEmail,
              customerName,
              error: error.message,
              stack: error.stack,
            });
          });

        // Send deposit received email with onboarding call CTA
        this.emailService
          .sendDepositReceivedEmail(
            customerEmail,
            updatedReservation.user?.firstName || updatedReservation.buyerName?.split(' ')[0] || 'Valued Guest',
            villaName,
          )
          .catch((error) => {
            this.logger.error(`❌ Failed to send deposit received email for reservation ${reservationId}`, {
              reservationId,
              customerEmail,
              error: error.message,
            });
          });

        // Admin email is sent by PaymentsService when webhook is received
        // No need to send here to avoid duplicate emails
      } else {
        this.logger.warn(`⚠️ Cannot send booking confirmation email: no email found for reservation ${reservationId}`);
      }
    } else {
      if (!this.emailService) {
        this.logger.warn(`⚠️ EmailService not available - cannot send booking confirmation email for reservation ${reservationId}`);
      }
      if (!updatedReservation.confirmedAt) {
        this.logger.warn(`⚠️ Reservation ${reservationId} has no confirmedAt date - cannot send booking confirmation email`);
      }
    }

    this.logger.log(`Reservation ${reservationId} confirmed with payment`);

    // Send shortlist deposit notifications (async, non-blocking)
    if (this.shortlistService && this.emailService) {
      this.shortlistService
        .getUsersWhoShortlistedUnit(reservation.unitId)
        .then((shortlistedUsers) => {
          // Filter out the current user (depositor)
          const otherUsers = shortlistedUsers.filter((u) => u.userId !== reservation.userId);

          if (otherUsers.length > 0) {
            this.logger.log(
              `📧 Sending shortlist notifications to ${otherUsers.length} users for Unit ${reservation.unit.unitNumber}`,
            );

            // Send email to each user (in parallel)
            Promise.all(
              otherUsers.map((user) =>
                this.emailService!.sendShortlistDepositNotificationEmail(
                  user.userEmail,
                  user.userName,
                  user.unitNumber,
                  user.unitType,
                  user.projectName,
                ).catch((error) => {
                  this.logger.error(
                    `Failed to send shortlist notification to ${user.userEmail}`,
                    error,
                  );
                }),
              ),
            ).then(() => {
              this.logger.log(
                `✅ Shortlist notifications sent for Unit ${reservation.unit.unitNumber}`,
              );
            });
          } else {
            this.logger.log(
              `No other users to notify for Unit ${reservation.unit.unitNumber}`,
            );
          }
        })
        .catch((error) => {
          this.logger.error('Failed to get shortlisted users', error);
        });
    }

    // Emit Socket.IO event for realtime updates
    if (this.reservationsGateway) {
      this.reservationsGateway.emitReservationUpdated(reservationId, reservation.unitId, 'CONFIRMED');
      this.reservationsGateway.emitUnitReserved(reservation.unitId, reservationId);
    }

    // Log payment success activity
    this.activityLogService.createActivityLog({
      userId: updatedReservation.userId,
      action: 'PAYMENT_SUCCESS',
      entity: 'Reservation',
      entityId: reservationId,
      metadata: { unitId: updatedReservation.unitId, amount: updatedReservation.depositAmount },
    }).catch(err => console.error('Failed to log payment success activity:', err));

    return this.mapToResponseDto(updatedReservation);
  }

  /**
   * ADMIN: List all reservations with optional filters
   */
  async listAllReservations(
    query: ReservationQueryDto & { userId?: string }
  ): Promise<{
    data: ReservationResponseDto[],
    total: number,
    page: number,
    limit: number
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      projectId,
      userId,
      sortBy = 'lockedAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (userId) {
      where.userId = userId;
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          unit: {
            include: { project: true }
          },
          user: true
        }
      }),
      this.prisma.reservation.count({ where })
    ]);

    return {
      data: reservations.map(this.mapToResponseDto),
      total,
      page,
      limit
    };
  }

  /**
   * ADMIN: Force expire a reservation
   */
  async forceExpireReservation(reservationId: string): Promise<ReservationResponseDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    if (!reservation) {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    if (reservation.status !== 'PENDING') {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.EXPIRED
      },
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      }
    });

    // Release unit lock
    await this.lockService.unlockUnit(reservation.unitId, 'admin');

    this.logger.log(`Reservation ${reservationId} force expired by admin`);

    // Emit Socket.IO event for realtime updates
    if (this.reservationsGateway) {
      this.reservationsGateway.emitReservationExpired(reservationId, reservation.unitId);
      this.reservationsGateway.emitUnitUnlocked(reservation.unitId);
    }

    return this.mapToResponseDto(updatedReservation);
  }

  /**
   * DEBUG: Get all reservations (for testing)
   */
  async debugGetAllReservations(): Promise<any[]> {
    const reservations = await this.prisma.reservation.findMany({
      include: {
        unit: {
          include: { project: true }
        },
        user: true
      },
      orderBy: { lockedAt: 'desc' }
    });

    return reservations.map(this.mapToResponseDto);
  }

  /**
   * Private helper methods
   */
  private mapToResponseDto(reservation: any): ReservationResponseDto {
    if (!reservation) {
      throw new Error('Reservation data is required');
    }

    const now = new Date();
    const expiresAtDate = reservation.expiresAt instanceof Date
      ? reservation.expiresAt
      : new Date(reservation.expiresAt);

    const timeRemaining = Math.max(0,
      Math.floor((expiresAtDate.getTime() - now.getTime()) / 1000)
    );

    return {
      id: reservation.id,
      userId: reservation.userId,
      unitId: reservation.unitId,
      projectId: reservation.projectId,
      status: reservation.status,
      lockedAt: reservation.lockedAt,
      expiresAt: expiresAtDate,
      confirmedAt: reservation.confirmedAt || undefined,
      timeRemaining,
      depositAmount: Number(reservation.depositAmount || 0),
      paymentIntentId: reservation.paymentIntentId || undefined,
      paymentStatus: reservation.paymentStatus,
      paymentMethod: reservation.paymentMethod || undefined,
      buyerName: reservation.buyerName || undefined,
      buyerEmail: reservation.buyerEmail || undefined,
      buyerPhone: reservation.buyerPhone || undefined,
      source: reservation.source || undefined,
      campaign: reservation.campaign || undefined,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      unit: reservation.unit ? {
        id: reservation.unit.id,
        unitNumber: reservation.unit.unitNumber,
        unitType: reservation.unit.unitType,
        price: Number(reservation.unit.price || 0),
        launchPrice: reservation.unit.launchPrice ? Number(reservation.unit.launchPrice) : null,
        imageUrls: (reservation.unit.imageUrls as string[]) || []
      } : undefined,
      project: reservation.unit?.project ? {
        id: reservation.unit.project.id,
        name: reservation.unit.project.name,
        developer: reservation.unit.project.developer
      } : undefined
    };
  }

  // ===== FIX 3: setTimeout methods removed =====
  // Reservation expiry is now handled by ReservationExpiryProcessor (Bull queue)
  // See reservation-expiry.processor.ts
}
