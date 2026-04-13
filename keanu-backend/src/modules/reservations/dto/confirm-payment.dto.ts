import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsEnum(['stripe', 'paystack'])
  paymentMethod: 'stripe' | 'paystack';

  // Contact information (required for confirmation)
  @IsString()
  @IsOptional()
  buyerName: string;

  @IsEmail()
  @IsOptional()
  buyerEmail: string;

  @IsOptional()
  @IsString()
  buyerPhone: string;

  // Optional metadata
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentIntentDto {
  @IsEnum(['stripe', 'paystack'])
  paymentMethod: 'stripe' | 'paystack';

  // Contact information
  @IsString()
  @IsOptional()
  buyerName: string;

  @IsEmail()
  @IsOptional()
  buyerEmail: string;

  @IsOptional()
  @IsString()
  buyerPhone: string;

  // Success/Cancel URLs for payment gateway
  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class PaymentIntentResponseDto {
  paymentIntentId: string;
  clientSecret?: string; // For Stripe
  paymentUrl?: string; // For Paystack
  amount: number;
  currency: string;
  status: string;
  expiresAt: Date;
  // Unit information for display
  unit?: {
    id: string;
    unitNumber: string;
    unitType: string;
    price: number;
  };
  productName?: string; // Formatted product name for Stripe
}
