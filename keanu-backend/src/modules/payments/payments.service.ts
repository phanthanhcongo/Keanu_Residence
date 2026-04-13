import { Injectable, Logger, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/payment-intent.dto';
import { PrismaService } from 'src/common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { GHLContactService } from '../integrations/ghl/ghl-contact.service';
import { EmailService } from '../notifications/email.service';
import { ReservationsGateway } from '../reservations/reservations.gateway';
import { PaymentIntentDto, PaymentIntentResponseDto } from '../reservations/dto/confirm-payment.dto';
import { throwError } from 'src/common/utils/error.utils';

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    unit: {
      include: {
        project: true;
      };
    };
    user: true;
  };
}>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Optional() private ghlContactService?: GHLContactService,
    @Optional() @Inject(EmailService) private emailService?: EmailService,
    @Optional() @Inject(forwardRef(() => ReservationsGateway)) private reservationsGateway?: ReservationsGateway,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not found in environment variables');
    } else {
      this.stripe = new Stripe(stripeSecretKey);
      this.logger.log('Stripe service initialized');
    }

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not found in environment variables');
    }
  }

  /**
   * Retrieve payment intent from Stripe
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    if (!this.stripe) {
      this.logger.error('[PAYMENT] Stripe is not configured');
      return null;
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`[PAYMENT] Failed to retrieve payment intent ${paymentIntentId}:`, {
        error: error.message,
      });
      return null;
    }
  }

  async createPaymentIntent(dto?: CreatePaymentIntentDto) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
    }

    const amount = dto?.amount || 2000; // Default to $10.00 (1000 cents)
    const currency = dto?.currency || 'usd';
    const productName = dto?.productName || 'Unknown Product';

    // Format giá để hiển thị
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);

    // Tạo description với tên sản phẩm và giá
    const description = `${productName} - ${formattedAmount}`;

    // Merge metadata với thông tin sản phẩm
    const metadata = {
      ...(dto?.metadata || {}),
      productName,
      productPrice: amount.toString(),
      productPriceFormatted: formattedAmount,
      currency,
    };

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        description, // Hiển thị trong Stripe Dashboard
        // Chỉ cho phép thanh toán bằng thẻ (card), tắt Link và các phương thức khác
        payment_method_types: ['card'],
        metadata, // Metadata để check trong webhook
      });

      this.logger.log(
        `Payment intent created: ${paymentIntent.id} - ${description}`,
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Error creating payment intent:', error);
      throw error;
    }
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
   * Create payment intent for reservation
   */
  async createReservationPaymentIntent(
    reservationId: string,
    userId: string,
    dto: PaymentIntentDto
  ): Promise<PaymentIntentResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throwError('USER_NOT_FOUND', 'User not found');
    }

    // Validate user profile has required information
    this.validateUserProfile(user);

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId
      },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            unitType: true,
            price: true,
            launchPrice: true,
          }
        }
      }
    });

    if (!reservation) {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    if (reservation.status !== 'PENDING') {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    if (new Date() > reservation.expiresAt) {
      throwError('VALIDATION_ERROR', 'Reservation not found');
    }

    // Only support Stripe for now
    if (dto.paymentMethod !== 'stripe') {
      throwError('VALIDATION_ERROR', 'Only Stripe payment method is supported');
    }

    // Calculate amount in cents
    const depositAmount = Number(reservation.depositAmount);
    const amountInCents = Math.round(depositAmount * 100);

    // Create product name from unit info
    const productName = `Unit ${reservation.unit.unitNumber} - Reservation Deposit`;

    // Create payment intent using self createPaymentIntent method
    const paymentIntentResult = await this.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      productName,
      metadata: {
        reservationId,
        unitId: reservation.unitId,
        userId,
        projectId: reservation.projectId,
      },
    });

    // Store payment intent details in reservation
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentIntentId: paymentIntentResult.paymentIntentId,
        paymentMethod: dto.paymentMethod
      }
    });

    return {
      paymentIntentId: paymentIntentResult.paymentIntentId,
      clientSecret: paymentIntentResult.clientSecret || undefined,
      amount: depositAmount,
      currency: 'USD',
      status: 'created',
      expiresAt: reservation.expiresAt,
      unit: {
        id: reservation.unit.id,
        unitNumber: reservation.unit.unitNumber,
        unitType: reservation.unit.unitType,
        price: reservation.unit.launchPrice && reservation.unit.launchPrice > 0
          ? Number(reservation.unit.launchPrice)
          : Number(reservation.unit.price),
      },
      productName: productName || undefined,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    this.logger.log(`[WEBHOOK] Received webhook request - Body size: ${rawBody.length} bytes, Signature present: ${!!signature}`);

    if (!this.stripe) {
      this.logger.error('[WEBHOOK] Stripe is not configured');
      throw new BadRequestException('Stripe is not configured');
    }

    // Require webhook secret for security - fail if not set
    if (!this.webhookSecret) {
      this.logger.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET is not set - webhook signature verification required for security');
      throw new BadRequestException('Webhook secret not configured. STRIPE_WEBHOOK_SECRET environment variable is required.');
    }

    // Require signature header
    if (!signature) {
      this.logger.error('[WEBHOOK] Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature - required for security
      this.logger.log('[WEBHOOK] Verifying webhook signature...');
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      this.logger.log('[WEBHOOK] Signature verification successful');
    } catch (err) {
      this.logger.error(`[WEBHOOK] Signature verification failed: ${err.message}`, err.stack);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    this.logger.log(`[WEBHOOK] Received webhook event: ${event.type} [${event.id}]`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          this.logger.log(`[WEBHOOK] Processing payment_intent.succeeded event`);
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          this.logger.log(`[WEBHOOK] Processing payment_intent.payment_failed event`);
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.created':
          this.logger.log(`[WEBHOOK] Processing payment_intent.created event`);
          await this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          this.logger.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
      }

      this.logger.log(`[WEBHOOK] Successfully processed event: ${event.type} [${event.id}]`);
      return { received: true };
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error handling webhook event ${event.type} [${event.id}]:`, {
        error: error.message,
        stack: error.stack,
        eventId: event.id,
        eventType: event.type,
      });
      throw error;
    }
  }

  /**
   * Find reservation by paymentIntentId (primary lookup method)
   */
  private async findReservationByPaymentIntentId(paymentIntentId: string): Promise<ReservationWithRelations | null> {
    try {
      this.logger.log(`[WEBHOOK] Looking up reservation by paymentIntentId: ${paymentIntentId}`);
      const reservation = await this.prisma.reservation.findFirst({
        where: { paymentIntentId },
        include: {
          unit: {
            include: { project: true }
          },
          user: true
        }
      });

      if (reservation) {
        this.logger.log(`[WEBHOOK] Found reservation ${reservation.id} by paymentIntentId`);
      } else {
        this.logger.warn(`[WEBHOOK] No reservation found with paymentIntentId: ${paymentIntentId}`);
      }

      return reservation;
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error finding reservation by paymentIntentId ${paymentIntentId}:`, {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const productName = paymentIntent.metadata?.productName || 'Unknown Product';
    const productPrice = paymentIntent.metadata?.productPriceFormatted ||
      `${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`;

    this.logger.log(
      `[WEBHOOK] PaymentIntent succeeded: ${paymentIntent.id} - ${productName} - ${productPrice}`,
    );
    this.logger.log(
      `[WEBHOOK] Payment details - Amount: ${paymentIntent.amount} ${paymentIntent.currency}, ` +
      `Description: ${paymentIntent.description || 'N/A'}, ` +
      `Metadata: ${JSON.stringify(paymentIntent.metadata)}`,
    );

    // Try to find reservation - use multiple lookup methods
    let reservation: ReservationWithRelations | null = null;
    let reservationId: string | null = null;

    // Method 1: Primary lookup by paymentIntentId (most reliable)
    this.logger.log(`[WEBHOOK] Attempting primary lookup by paymentIntentId: ${paymentIntent.id}`);
    reservation = await this.findReservationByPaymentIntentId(paymentIntent.id);

    if (reservation) {
      reservationId = reservation.id;
      this.logger.log(`[WEBHOOK] Found reservation ${reservationId} via paymentIntentId lookup`);
    } else {
      // Method 2: Fallback lookup by metadata reservationId
      reservationId = paymentIntent.metadata?.reservationId || null;
      if (reservationId) {
        this.logger.log(`[WEBHOOK] Primary lookup failed, trying fallback by reservationId: ${reservationId}`);
        try {
          reservation = await this.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
              unit: {
                include: { project: true }
              },
              user: true
            }
          });

          if (reservation) {
            this.logger.log(`[WEBHOOK] Found reservation ${reservationId} via metadata lookup`);

            // If paymentIntentId doesn't match, update it
            if (reservation.paymentIntentId !== paymentIntent.id) {
              this.logger.warn(
                `[WEBHOOK] Reservation ${reservationId} has paymentIntentId ${reservation.paymentIntentId} but webhook has ${paymentIntent.id}. Updating...`
              );
              try {
                await this.prisma.reservation.update({
                  where: { id: reservationId },
                  data: { paymentIntentId: paymentIntent.id }
                });
                this.logger.log(`[WEBHOOK] Updated reservation ${reservationId} paymentIntentId to ${paymentIntent.id}`);
              } catch (updateError) {
                this.logger.error(`[WEBHOOK] Failed to update paymentIntentId for reservation ${reservationId}:`, {
                  error: updateError.message,
                });
              }
            }
          } else {
            this.logger.warn(`[WEBHOOK] Reservation ${reservationId} from metadata not found in database`);
          }
        } catch (error) {
          this.logger.error(`[WEBHOOK] Error looking up reservation ${reservationId}:`, {
            error: error.message,
            stack: error.stack,
          });
        }
      } else {
        this.logger.warn(`[WEBHOOK] No reservationId in metadata and no reservation found by paymentIntentId. PaymentIntent ${paymentIntent.id} may not be for a reservation.`);
      }
    }

    // Update reservation if found
    if (reservation && reservationId) {
      try {
        // Check if already succeeded (idempotency)
        if (reservation.paymentStatus === 'SUCCEEDED' && reservation.status === 'CONFIRMED') {
          this.logger.log(`[WEBHOOK] Reservation ${reservationId} is already SUCCEEDED/CONFIRMED. Skipping update (idempotent).`);
          return;
        }

        this.logger.log(`[WEBHOOK] Updating reservation ${reservationId} to SUCCEEDED/CONFIRMED`);
        // Set confirmed date (we'll use this for the email)
        const confirmedAt = new Date();

        // Update reservation payment status and status
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: {
            paymentStatus: 'SUCCEEDED',
            status: 'CONFIRMED',
            confirmedAt: confirmedAt,
          }
        });
        this.logger.log(`[WEBHOOK] ✅ Reservation ${reservationId} updated to SUCCEEDED/CONFIRMED`);

        // Update unit status to RESERVED
        await this.prisma.unit.update({
          where: { id: reservation.unitId },
          data: {
            status: 'RESERVED',
          }
        });
        this.logger.log(`[WEBHOOK] ✅ Unit ${reservation.unitId} marked as RESERVED`);

        this.logger.log(
          `[WEBHOOK] ✅ Successfully processed payment for reservation ${reservationId} and unit ${reservation.unitId}`,
        );

        // Emit WebSocket event to notify all clients that unit has been reserved
        if (this.reservationsGateway) {
          this.reservationsGateway.emitUnitReserved(reservation.unitId, reservationId);
          this.reservationsGateway.emitReservationUpdated(reservationId, reservation.unitId, 'CONFIRMED');
        } else {
          this.logger.warn(`⚠️ ReservationsGateway not available - cannot emit unit reserved event for unit ${reservation.unitId}`);
        }

        // Send unit reserved alert emails to all users who shortlisted this unit (async, non-blocking)
        if (this.emailService) {
          this.logger.log(`📧 Checking for shortlisted users to notify about unit ${reservation.unitId} being reserved`);

          this.prisma.shortlist
            .findMany({
              where: {
                unitId: reservation.unitId,
                isDeleted: false,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            })
            .then((shortlistedItems) => {
              // Filter out the user who made the reservation (they already get booking confirmation)
              const shortlistedUsers = shortlistedItems.filter(
                (item) => item.userId !== reservation.userId && item.user?.email,
              );

              if (shortlistedUsers.length === 0) {
                this.logger.log(`ℹ️ No shortlisted users to notify (excluding reserving user) for unit ${reservation.unitId}`);
                return;
              }

              this.logger.log(`📧 Sending unit reserved alerts to ${shortlistedUsers.length} shortlisted user(s) for unit ${reservation.unitId}`);

              const unitNumber = reservation.unit?.unitNumber || reservation.unit?.unitType || 'Unit';
              const unitType = reservation.unit?.unitType || 'Villa';
              const projectName = reservation.unit?.project?.name || 'Keanu Residences';
              const projectLocation = reservation.unit?.project?.location || 'Bali, Indonesia';

              // Send email to each shortlisted user
              shortlistedUsers.forEach((shortlistItem) => {
                const user = shortlistItem.user;
                if (!user || !user.email) {
                  this.logger.warn(`⚠️ Skipping shortlisted user ${shortlistItem.userId} - no email address`);
                  return;
                }

                const userName =
                  user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName || user.lastName || 'Valued Guest';

                this.emailService!
                  .sendUnitReservedAlertEmail(
                    userName,
                    user.email,
                    unitNumber,
                    unitType,
                    projectName,
                    projectLocation,
                  )
                  .then(() => {
                    this.logger.log(`✅ Unit reserved alert email sent successfully to ${user.email} for unit ${reservation.unitId}`);
                  })
                  .catch((error) => {
                    this.logger.error(`❌ Failed to send unit reserved alert email to ${user.email}`, {
                      userId: user.id,
                      userEmail: user.email,
                      unitId: reservation.unitId,
                      error: error.message,
                      stack: error.stack,
                    });
                  });
              });
            })
            .catch((error) => {
              this.logger.error(`❌ Failed to query shortlisted users for unit ${reservation.unitId}`, {
                unitId: reservation.unitId,
                error: error.message,
                stack: error.stack,
              });
            });
        } else {
          this.logger.warn(`⚠️ EmailService not available - cannot send unit reserved alerts for unit ${reservation.unitId}`);
        }

        // Add tags to GHL contact (payment and reservation)
        if (this.ghlContactService && reservation.userId) {
          this.ghlContactService
            .upsertContactFromUser(
              reservation.userId,
              {
                email: reservation.buyerEmail || undefined,
                firstName: reservation.buyerName?.split(' ')[0] || undefined,
                lastName: reservation.buyerName?.split(' ').slice(1).join(' ') || undefined,
                phoneNumber: reservation.buyerPhone || undefined,
              },
              ['payment', 'reservation'],
              { unitId: reservation.unit?.unitNumber || reservation.unitId },
            )
            .catch((error) => {
              this.logger.error('Failed to add tags after payment success', {
                reservationId,
                userId: reservation.userId,
                error: error.message,
              });
            });
        }

        // Send booking confirmation email
        if (this.emailService) {
          const customerEmail = reservation.buyerEmail || reservation.user?.email;
          const customerName = reservation.buyerName || reservation.user?.firstName || 'Valued Customer';

          if (customerEmail) {
            const villaName = reservation.unit?.unitNumber || reservation.unit?.unitType || 'Villa';
            const address = reservation.unit?.project?.location || reservation.unit?.project?.name || 'Bali, Indonesia';

            this.logger.log(`📧 Attempting to send booking confirmation email for reservation ${reservationId} to ${customerEmail}`);

            this.emailService
              .sendBookingConfirmationEmail(
                reservation.id,
                customerName,
                customerEmail,
                villaName,
                address,
                confirmedAt,
                Number(reservation.depositAmount),
              )
              .then(() => {
                this.logger.log(`✅ Booking confirmation email sent successfully for reservation ${reservationId} to ${customerEmail}`);
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
                reservation.user?.firstName || reservation.buyerName?.split(' ')[0] || 'Valued Guest',
                villaName,
              )
              .catch((error) => {
                this.logger.error(`❌ Failed to send deposit received email for reservation ${reservationId}`, {
                  reservationId,
                  customerEmail,
                  error: error.message,
                });
              });

            // Send admin notification email (async, non-blocking)
            const customerPhone = reservation.buyerPhone || reservation.user?.phoneNumber || null;
            const paymentMethod = reservation.paymentMethod || 'stripe';
            const paymentTransactionId = reservation.paymentIntentId || paymentIntent.id;
            const orderValue = Number(reservation.depositAmount);

            this.emailService
              .sendAdminSaleNotificationEmail(
                customerName,
                customerEmail,
                customerPhone,
                villaName,
                orderValue,
                paymentMethod,
                reservation.userId,
                paymentTransactionId,
                reservation.id,
              )
              .then(() => {
                this.logger.log(`✅ Admin sales notification email sent successfully for reservation ${reservationId}`);
              })
              .catch((error) => {
                this.logger.error(`❌ Failed to send admin sales notification email for reservation ${reservationId}`, {
                  reservationId,
                  error: error.message,
                  stack: error.stack,
                });
              });
          } else {
            this.logger.warn(`⚠️ Cannot send booking confirmation email: no email found for reservation ${reservationId}`);
          }
        } else {
          this.logger.warn(`⚠️ EmailService not available - cannot send booking confirmation email for reservation ${reservationId}`);
        }
      } catch (error) {
        this.logger.error(
          `[WEBHOOK] ❌ Failed to update reservation ${reservationId} after payment success:`,
          {
            error: error.message,
            stack: error.stack,
            reservationId,
            paymentIntentId: paymentIntent.id,
          },
        );
      }
    } else {
      this.logger.warn(
        `[WEBHOOK] ⚠️ Could not find reservation for paymentIntent ${paymentIntent.id}. ` +
        `Metadata reservationId: ${paymentIntent.metadata?.reservationId || 'none'}. ` +
        `This payment may not be for a reservation, or reservation lookup failed.`
      );
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const productName = paymentIntent.metadata?.productName || 'Unknown Product';
    const productPrice = paymentIntent.metadata?.productPriceFormatted ||
      `${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`;

    this.logger.warn(
      `PaymentIntent failed: ${paymentIntent.id} - ${productName} - ${productPrice}`,
    );
    this.logger.warn(
      `Payment details - Amount: ${paymentIntent.amount} ${paymentIntent.currency}, ` +
      `Description: ${paymentIntent.description || 'N/A'}, ` +
      `Metadata: ${JSON.stringify(paymentIntent.metadata)}`,
    );

    // Update reservation payment status if this payment is for a reservation
    const reservationId = paymentIntent.metadata?.reservationId;
    if (reservationId) {
      try {
        const reservation = await this.prisma.reservation.findUnique({
          where: { id: reservationId },
        });

        if (reservation && reservation.paymentIntentId === paymentIntent.id) {
          // Update reservation payment status to FAILED
          await this.prisma.reservation.update({
            where: { id: reservationId },
            data: {
              paymentStatus: 'FAILED',
            }
          });

          this.logger.warn(
            `Reservation ${reservationId} payment marked as FAILED`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to update reservation ${reservationId} after payment failure:`,
          error,
        );
      }
    }
  }

  private async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent) {
    const productName = paymentIntent.metadata?.productName || 'Unknown Product';
    const productPrice = paymentIntent.metadata?.productPriceFormatted ||
      `${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`;

    this.logger.log(
      `PaymentIntent created: ${paymentIntent.id} - ${productName} - ${productPrice}`,
    );
    this.logger.log(
      `Payment details - Amount: ${paymentIntent.amount} ${paymentIntent.currency}, ` +
      `Description: ${paymentIntent.description || 'N/A'}, ` +
      `Metadata: ${JSON.stringify(paymentIntent.metadata)}`,
    );
  }
}

