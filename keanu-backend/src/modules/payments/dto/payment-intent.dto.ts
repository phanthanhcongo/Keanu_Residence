import { IsOptional, IsNumber, IsString, IsObject, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiPropertyOptional({
    description: 'Amount in cents (e.g., 1000 = $10.00)',
    example: 1000,
    minimum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency code (e.g., usd, eur)',
    example: 'usd',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Product name for display and tracking',
    example: 'Quả táo',
  })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata to attach to the payment intent',
    example: { orderId: '123', userId: '456' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

