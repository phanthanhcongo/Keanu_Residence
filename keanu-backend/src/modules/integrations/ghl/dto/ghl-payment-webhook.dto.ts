import { IsString, IsOptional, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GhlInvoiceDto {
  @ApiProperty({ example: 'inv_123' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'paid' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional({ example: '2025-02-10' })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'cont_987' })
  @IsOptional()
  @IsString()
  contact_id?: string;
}

export class GhlPaymentDto {
  @ApiProperty({ example: 'pay_456' })
  @IsString()
  id: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 'credit_card' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'success' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2025-02-09T10:01:00Z' })
  @IsOptional()
  @IsString()
  transaction_date?: string;
}

export class GhlContactDto {
  @ApiPropertyOptional({ example: 'buyer@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class GhlPaymentWebhookDto {
  @ApiPropertyOptional({ example: 'invoice.payment.received' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiProperty({ type: GhlInvoiceDto })
  @ValidateNested()
  @Type(() => GhlInvoiceDto)
  @IsObject()
  invoice: GhlInvoiceDto;

  @ApiProperty({ type: GhlPaymentDto })
  @ValidateNested()
  @Type(() => GhlPaymentDto)
  @IsObject()
  payment: GhlPaymentDto;

  @ApiPropertyOptional({ type: GhlContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GhlContactDto)
  @IsObject()
  contact?: GhlContactDto;
}
