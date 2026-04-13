import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateReservationDto,
  ReservationQueryDto,
  ReservationResponseDto,
  CreateReservationResponseDto
} from './dto/create-reservation.dto';
import {
  ConfirmPaymentDto,
  PaymentIntentDto,
  PaymentIntentResponseDto
} from './dto/confirm-payment.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly paymentsService: PaymentsService,
  ) { }

  /**
   * POST /api/reservations
   * Create reservation (lock unit)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new reservation (lock unit for 10 minutes)' })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    schema: {
      example: {
        success: true,
        message: 'Reservation created successfully. You have 10 minutes to complete payment.',
        data: {
          id: 'reservation_id',
          userId: 'user_id',
          unitId: 'unit_id',
          projectId: 'project_id',
          status: 'PENDING',
          lockedAt: '2025-11-13T10:00:00Z',
          expiresAt: '2025-11-13T10:10:00Z',
          timeRemaining: 600,
          depositAmount: 50000,
          paymentStatus: 'PENDING',
          unit: {
            id: 'unit_id',
            unitNumber: 'A-101',
            unitType: '2BR',
            price: 500000
          },
          project: {
            id: 'project_id',
            name: 'Luxury Tower',
            developer: 'ABC Corp'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Unit already locked or unavailable' })
  async createReservation(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<CreateReservationResponseDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.reservationsService.createReservation(user.id, createReservationDto);
  }

  /**
   * GET /api/reservations/:id
   * Get reservation details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get reservation details by ID' })
  @ApiResponse({ status: 200, description: 'Reservation details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async getReservation(
    @Param('id') reservationId: string,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<ReservationResponseDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.reservationsService.getReservation(reservationId, user.id);
  }

  /**
   * GET /api/reservations
   * List user's reservations
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all reservations for the current user' })
  @ApiResponse({ status: 200, description: 'Reservations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listReservations(
    @Query() query: ReservationQueryDto,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ data: ReservationResponseDto[], total: number, page: number, limit: number }> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.reservationsService.listReservations(user.id, query);
  }

  /**
   * DELETE /api/reservations/:id
   * Cancel reservation
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async cancelReservation(
    @Param('id') reservationId: string,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<ReservationResponseDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.reservationsService.cancelReservation(reservationId, user.id);
  }


  /**
   * POST /api/reservations/:id/confirm
   * Confirm payment
   */
  @Post(':id/confirm')
  async confirmPayment(
    @Param('id') reservationId: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.confirmPayment(reservationId, confirmPaymentDto);
  }

  /**
   * POST /api/reservations/:id/check-payment-status
   * Manually check payment status from Stripe and update if needed
   */
  @Post(':id/check-payment-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually check payment status from Stripe and update reservation' })
  @ApiResponse({ status: 200, description: 'Payment status checked and updated if needed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async checkPaymentStatus(
    @Param('id') reservationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('paymentIntentId') paymentIntentId?: string,
  ): Promise<{ updated: boolean; message: string }> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const reservation = await this.reservationsService.getReservation(reservationId, user.id);
    console.log('Reservation:', reservation);

    const targetPaymentIntentId = paymentIntentId || reservation.paymentIntentId;

    if (!targetPaymentIntentId) {
      return {
        updated: false,
        message: 'No payment intent ID found for this reservation'
      };
    }

    try {
      // Check payment intent status in Stripe
      const paymentIntent = await this.paymentsService.retrievePaymentIntent(targetPaymentIntentId);

      if (!paymentIntent) {
        return {
          updated: false,
          message: 'Could not retrieve payment intent from Stripe'
        };
      }


      if (
        paymentIntent.status === 'succeeded' &&
        (reservation.paymentStatus !== 'SUCCEEDED' || reservation.status !== 'CONFIRMED')
      ) {
        // Manually trigger the webhook handler logic
        await this.paymentsService.handlePaymentIntentSucceeded(paymentIntent);
        return {
          updated: true,
          message: 'Payment status updated to SUCCEEDED'
        };
      }

      return {
        updated: false,
        message: `Payment status is ${paymentIntent.status}, reservation status is ${reservation.paymentStatus}`
      };
    } catch (error) {
      return {
        updated: false,
        message: `Error checking payment status: ${error.message}`
      };
    }
  }
}

/**
 * Admin Controller for reservation management
 * NOTE: This controller is disabled - using AdminController in admin module instead
 */
// @Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly reservationsService: ReservationsService) { }

  /**
   * GET /api/admin/reservations
   * List all reservations (admin only)
   */
  @Get()
  @ApiOperation({
    summary: 'List all reservations (Admin only)',
    description: 'Retrieve a list of all reservations. Requires Admin or Super Admin role.',
  })
  @ApiResponse({ status: 200, description: 'All reservations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role)' })
  async listAllReservations(
    @Query() query: ReservationQueryDto & { userId?: string },
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ data: ReservationResponseDto[], total: number, page: number, limit: number }> {
    // Admin can list all reservations with optional filters (userId, projectId, status)
    return this.reservationsService.listAllReservations(query);
  }

  /**
   * GET /api/admin/reservations/export
   * Export reservations (CSV)
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export reservations data (Admin only)',
    description: 'Export reservation data to CSV or XLSX format. Requires Admin or Super Admin role.',
  })
  @ApiResponse({ status: 200, description: 'Download URL for export file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role)' })
  async exportReservations(
    @Query() query: { projectId?: string; format?: 'csv' | 'xlsx' },
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ downloadUrl: string }> {
    // TODO: Implement export functionality
    return {
      downloadUrl: '/api/admin/downloads/reservations-export.csv'
    };
  }

  /**
   * GET /api/admin/reservations/stats
   * Get reservation statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get reservation statistics (Admin only)',
    description: 'Retrieve various statistics about reservations. Requires Admin or Super Admin role.',
  })
  @ApiResponse({ status: 200, description: 'Reservation statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role)' })
  async getReservationStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('projectId') projectId?: string
  ): Promise<{
    totalReservations: number;
    confirmedReservations: number;
    pendingReservations: number;
    expiredReservations: number;
    totalRevenue: number;
    conversionRate: number;
  }> {
    // TODO: Implement statistics calculation
    return {
      totalReservations: 0,
      confirmedReservations: 0,
      pendingReservations: 0,
      expiredReservations: 0,
      totalRevenue: 0,
      conversionRate: 0
    };
  }

  /**
   * POST /api/admin/reservations/:id/force-expire
   * Force expire a reservation (admin only)
   */
  @Post(':id/force-expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force expire a reservation (Admin only)',
    description: 'Manually expire an active reservation. Requires Admin or Super Admin role.',
  })
  @ApiResponse({ status: 200, description: 'Reservation forcefully expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role)' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async forceExpireReservation(
    @Param('id') reservationId: string,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ message: string }> {
    await this.reservationsService.forceExpireReservation(reservationId);
    return { message: 'Reservation forcefully expired' };
  }
}
