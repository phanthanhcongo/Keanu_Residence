import { IsString, IsOptional, IsEmail, IsDecimal, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateReservationDto {
  @IsUUID()
  unitId: string;

  @IsOptional()
  @IsUUID()
  projectId: string;

  // Contact Information (Optional - can be filled during payment)
  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  buyerPhone?: string;

  // Tracking (UTM parameters)
  @IsOptional()
  @IsString()
  source?: string; // UTM source

  @IsOptional()
  @IsString()
  campaign?: string; // UTM campaign
}

export class ReservationQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'expiresAt' | 'confirmedAt' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ReservationResponseDto {
  id: string;
  userId: string;
  unitId: string;
  projectId: string;
  
  // Reservation Flow
  status: string;
  lockedAt: Date;
  expiresAt: Date;
  confirmedAt?: Date;
  timeRemaining: number; // seconds until expiry
  
  // Payment
  depositAmount: number;
  paymentIntentId?: string;
  paymentStatus: string;
  paymentMethod?: string;
  
  // Contact
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  
  // Tracking
  source?: string;
  campaign?: string;
  
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated when needed)
  unit?: {
    id: string;
    unitNumber: string;
    unitType: string;
    price: number;
    launchPrice?: number | null;
    imageUrls?: string[];
  };

  project?: {
    id: string;
    name: string;
    developer: string;
  };
}

export class CreateReservationResponseDto {
  success: boolean;
  message: string;
  data: ReservationResponseDto;
}
