import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { GhlPaymentWebhookDto } from './dto/ghl-payment-webhook.dto';
import { GHLContactService } from './ghl-contact.service';
import { EmailService } from '../../notifications/email.service';

@Injectable()
export class GhlPaymentService {
  private readonly logger = new Logger(GhlPaymentService.name);

  constructor(
    private prisma: PrismaService,
    private ghlContactService?: GHLContactService,
    @Optional() @Inject(EmailService) private emailService?: EmailService,
  ) {}

  async processInvoicePayment(data: GhlPaymentWebhookDto) {
    const { invoice, payment, contact } = data;

    if (!invoice?.id || !payment?.id)
      return { success: false, message: "Invalid payload" };

    if (!contact?.email)
      return { success: false, message: "Missing contact email" };

    // 1. Find user by email from invoice webhook
    const user = await this.prisma.user.findUnique({ where: { email: contact.email }});
    if (!user) return { success:false, message:"User not registered" };

    // 2. Get pending reservation of user
    const reservation = await this.prisma.reservation.findFirst({
      where:{
        userId:user.id,
        paymentStatus:"PENDING",
        isDeleted:false
      }
    });

    // 3. Save Payment
    await this.prisma.payment.create({
      data:{
        reservationId:reservation?.id,
        invoiceId:invoice.id,
        paymentId:payment.id,
        amount:payment.amount,
        currency:payment.currency ?? "USD",
        status:"SUCCEEDED",
        provider:payment.method ?? "GHL",
        paidAt:payment.transaction_date? new Date(payment.transaction_date) : null,
        rawPayload:data as any
      }
    });

    // 4. Update Reservation
    if(reservation){
      await this.prisma.reservation.update({
        where:{ id:reservation.id },
        data:{
          paymentStatus:"SUCCEEDED",
          status:"CONFIRMED",
          confirmedAt:new Date()
        }
      });
      await this.prisma.unit.update({
        where:{ id:reservation.unitId },
        data:{ status:"RESERVED" }
      });

      // Add tags to GHL contact (payment and reservation)
      if (this.ghlContactService && reservation.userId) {
        const reservationWithUnit = await this.prisma.reservation.findUnique({
          where: { id: reservation.id },
          include: { unit: true }
        });

        this.ghlContactService
          .upsertContactFromUser(
            reservation.userId,
            {
              email: user.email || undefined,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              phoneNumber: user.phoneNumber || undefined,
            },
            ['payment', 'reservation'],
            { unitId: reservationWithUnit?.unit?.unitNumber || reservation.unitId },
          )
          .catch((error) => {
            this.logger.error('Failed to add tags after GHL payment success', {
              reservationId: reservation.id,
              userId: reservation.userId,
              error: error.message,
            });
          });
      }

      // Send admin notification email (async, non-blocking)
      // TODO: Temporarily disabled - re-enable when needed
      // if (this.emailService) {
      //   const reservationWithDetails = await this.prisma.reservation.findUnique({
      //     where: { id: reservation.id },
      //     include: {
      //       unit: {
      //         include: { project: true }
      //       },
      //       user: true
      //     }
      //   });

      //   if (reservationWithDetails) {
      //     const customerName = reservationWithDetails.buyerName || 
      //       (reservationWithDetails.user?.firstName 
      //         ? `${reservationWithDetails.user.firstName}${reservationWithDetails.user.lastName ? ` ${reservationWithDetails.user.lastName}` : ''}`
      //         : 'Valued Customer');
      //     const customerEmail = reservationWithDetails.buyerEmail || reservationWithDetails.user?.email || '';
      //     const customerPhone = reservationWithDetails.buyerPhone || reservationWithDetails.user?.phoneNumber || null;
      //     const villaName = reservationWithDetails.unit?.unitNumber || reservationWithDetails.unit?.unitType || 'Villa';
      //     const paymentMethod = reservationWithDetails.paymentMethod || 'GHL';
      //     const paymentTransactionId = payment.id || null;
      //     const orderValue = Number(reservationWithDetails.depositAmount);

      //     if (customerEmail) {
      //       this.emailService
      //         .sendAdminSaleNotificationEmail(
      //           customerName,
      //           customerEmail,
      //           customerPhone,
      //           villaName,
      //           orderValue,
      //           paymentMethod,
      //           reservationWithDetails.userId,
      //           paymentTransactionId,
      //           reservationWithDetails.id,
      //         )
      //         .then(() => {
      //           this.logger.log(`✅ Admin sales notification email sent successfully for reservation ${reservationWithDetails.id}`);
      //         })
      //         .catch((error) => {
      //           this.logger.error(`❌ Failed to send admin sales notification email for reservation ${reservationWithDetails.id}`, {
      //             reservationId: reservationWithDetails.id,
      //             error: error.message,
      //             stack: error.stack,
      //           });
      //         });
      //     }
      //   }
      // }
    }

    return { success:true };
  }
}
