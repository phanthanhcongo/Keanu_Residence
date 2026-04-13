import { IsOptional, IsString, IsEnum, IsInt, IsUUID, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ReservationStatus, PaymentStatus } from '@prisma/client';

export class ListReservationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Include deleted records', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return false;
    if (value === 'true' || value === '1' || value === true) return true;
    if (value === 'false' || value === '0' || value === false) return false;
    return Boolean(value);
  })
  includeDeleted?: boolean = false;
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}

