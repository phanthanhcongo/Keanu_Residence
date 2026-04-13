import { ApiProperty } from "@nestjs/swagger";

export class GhlInvoiceApiItemDto {
  @ApiProperty() id: string;
  @ApiProperty() status: string;
  @ApiProperty() total: number;
  @ApiProperty() balance: number;
  @ApiProperty() contact_id: string;
  @ApiProperty({ required:false }) created_at?: string;
  @ApiProperty({ required:false }) updated_at?: string;
}

export class GhlInvoiceListResponseDto {
  @ApiProperty({ type: [GhlInvoiceApiItemDto] })
  invoices: GhlInvoiceApiItemDto[];
}
