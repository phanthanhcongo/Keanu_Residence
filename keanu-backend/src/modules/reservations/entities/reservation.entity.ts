import { Expose } from 'class-transformer';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

@Expose()
export class ReservationEntity {
  id: string;
  userId: string;
  unitId: string;
  projectId: string;
  
  // Reservation Flow
  status: ReservationStatus; // Default: 'PENDING'
  lockedAt: Date; // Default: now()
  expiresAt: Date; // lockedAt + project.reservationDuration
  confirmedAt?: Date;
  
  // Payment
  depositAmount: number; // DECIMAL(10,2)
  paymentIntentId?: string; // Stripe/Paystack ID
  paymentStatus: PaymentStatus; // Default: 'PENDING'
  paymentMethod?: string; // 'stripe' or 'paystack'
  
  // Contact
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  
  // Tracking
  source?: string; // UTM source
  campaign?: string; // UTM campaign
  
  createdAt: Date;
  updatedAt: Date;
}