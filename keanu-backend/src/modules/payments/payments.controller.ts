import { Controller, Post, Body, Req, Headers, HttpCode, HttpStatus, BadRequestException, Get, Param, UseGuards, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ReservationsService } from '../reservations/reservations.service';
import { PaymentIntentDto, PaymentIntentResponseDto } from '../reservations/dto/confirm-payment.dto';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/payment-intent.dto';
import { PrismaService } from 'src/common/services/prisma.service';

@ApiTags('payments')
@Controller('payment')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ReservationsService))
    private readonly reservationsService: ReservationsService,
  ) { }

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment intent for Stripe' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
    schema: {
      type: 'object',
      properties: {
        clientSecret: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPaymentIntent(@Body() dto?: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  /**
   * POST /api/payment/:id/payment-intent
   * Create payment intent for a reservation
   */
  @Post(':id/payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create payment intent for a reservation' })
  @ApiResponse({ status: 200, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async createReservationPaymentIntent(
    @Param('id') reservationId: string,
    @Body() paymentIntentDto: PaymentIntentDto,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<PaymentIntentResponseDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.paymentsService.createReservationPaymentIntent(reservationId, user.id, paymentIntentDto);
  }
  @Get('debug/:paymentIntentId')
  @ApiOperation({ summary: 'Debug: Check payment intent status and metadata' })
  @ApiResponse({ status: 200, description: 'Payment intent debug info' })
  async debugPaymentIntent(@Param('paymentIntentId') paymentIntentId: string) {
    try {
      // Check if paymentIntent exists in Stripe
      const paymentIntent = await this.paymentsService.retrievePaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        return { error: 'Payment intent not found or Stripe not configured' };
      }

      // Check if reservation exists with this paymentIntentId
      const reservation = await this.prisma.reservation.findFirst({
        where: { paymentIntentId },
        select: {
          id: true,
          paymentIntentId: true,
          paymentStatus: true,
          status: true,
          unitId: true,
        }
      });

      return {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          created: new Date(paymentIntent.created * 1000).toISOString(),
        },
        reservation: reservation || null,
        match: reservation ? reservation.paymentIntentId === paymentIntentId : false,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('debug/reservation/:reservationId')
  @ApiOperation({ summary: 'Debug: Check reservation payment intent info' })
  @ApiResponse({ status: 200, description: 'Reservation debug info' })
  async debugReservation(@Param('reservationId') reservationId: string) {
    try {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          paymentIntentId: true,
          paymentStatus: true,
          status: true,
          unitId: true,
          createdAt: true,
        }
      });

      if (!reservation) {
        return { error: 'Reservation not found' };
      }

      // If paymentIntentId exists, check Stripe
      let paymentIntentInfo: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        metadata: Record<string, string>;
      } | { error: string } | null = null;
      if (reservation.paymentIntentId) {
        try {
          const paymentIntent = await this.paymentsService.retrievePaymentIntent(reservation.paymentIntentId);
          if (paymentIntent) {
            paymentIntentInfo = {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              metadata: paymentIntent.metadata,
            };
          }
        } catch (error: any) {
          paymentIntentInfo = { error: error.message };
        }
      }

      return {
        reservation,
        paymentIntent: paymentIntentInfo,
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

@ApiTags('payments')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw body is required for webhook signature verification');
    }
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}

