import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { ReservationLockService } from './reservation-lock.service';
import { ReservationsGateway } from './reservations.gateway';
import { EmailService } from '../notifications/email.service';

@Processor('reservation-expiry')
@Injectable()
export class ReservationExpiryProcessor {
    private readonly logger = new Logger(ReservationExpiryProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly lockService: ReservationLockService,
        @Optional() private readonly reservationsGateway?: ReservationsGateway,
        @Optional() private readonly emailService?: EmailService,
    ) { }

    @Process('expire')
    async handleExpire(job: Job<{ reservationId: string }>) {
        const { reservationId } = job.data;
        this.logger.log(`Processing expiry job for reservation ${reservationId} (job ${job.id})`);

        try {
            const reservation = await this.prisma.reservation.findUnique({
                where: { id: reservationId },
            });

            if (!reservation) {
                this.logger.warn(`Reservation ${reservationId} not found — skipping expiry`);
                return;
            }

            // Only expire if still PENDING
            if (reservation.status !== 'PENDING') {
                this.logger.log(
                    `Reservation ${reservationId} is ${reservation.status} — no need to expire`,
                );
                return;
            }

            // Update reservation status to EXPIRED
            await this.prisma.reservation.update({
                where: { id: reservationId },
                data: { status: 'EXPIRED' },
            });

            // Release unit lock
            await this.lockService.unlockUnit(reservation.unitId, reservation.userId);

            this.logger.log(`Reservation ${reservationId} expired via Bull job`);

            // Emit WebSocket events
            if (this.reservationsGateway) {
                this.reservationsGateway.emitReservationExpired(reservationId, reservation.unitId);
                this.reservationsGateway.emitUnitUnlocked(reservation.unitId);
            }
        } catch (error) {
            this.logger.error(`Failed to expire reservation ${reservationId}:`, error);
            throw error; // Let Bull retry
        }
    }

    @Process('payment-reminder')
    async handlePaymentReminder(
        job: Job<{ reservationId: string; unitNumber: string; depositAmount: number }>,
    ) {
        const { reservationId, unitNumber, depositAmount } = job.data;
        this.logger.log(`Processing payment reminder job for reservation ${reservationId}`);

        try {
            // Check if reservation is still pending
            const reservation = await this.prisma.reservation.findUnique({
                where: { id: reservationId },
                include: {
                    user: true,
                },
            });

            if (reservation && reservation.status === 'PENDING' && this.emailService) {
                const customerEmail = reservation.buyerEmail || reservation.user?.email;
                const customerName =
                    reservation.buyerName ||
                    (reservation.user?.firstName
                        ? `${reservation.user.firstName}${reservation.user.lastName ? ` ${reservation.user.lastName}` : ''}`
                        : 'Valued Customer');

                if (customerEmail) {
                    const remainingMinutes = Math.max(
                        0,
                        Math.floor((reservation.expiresAt.getTime() - Date.now()) / (60 * 1000)),
                    );

                    this.logger.log(
                        `📧 Sending payment reminder for reservation ${reservationId} to ${customerEmail}`,
                    );

                    await this.emailService.sendPaymentReminderEmail(
                        customerEmail,
                        customerName,
                        unitNumber,
                        depositAmount,
                        remainingMinutes,
                        reservationId,
                    );
                    this.logger.log(
                        `✅ Payment reminder sent successfully for reservation ${reservationId}`,
                    );
                } else {
                    this.logger.warn(
                        `⚠️ Cannot send payment reminder: no email found for reservation ${reservationId}`,
                    );
                }
            } else {
                if (!reservation) {
                    this.logger.log(`Reservation ${reservationId} not found, skipping reminder`);
                } else if (reservation.status !== 'PENDING') {
                    this.logger.log(
                        `Reservation ${reservationId} is ${reservation.status}, skipping reminder`,
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Failed to send payment reminder for ${reservationId}:`, error);
        }
    }
}
