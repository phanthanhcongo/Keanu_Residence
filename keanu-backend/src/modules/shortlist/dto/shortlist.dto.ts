import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddToShortlistDto {
  @ApiProperty({
    description: 'Unit ID to add to shortlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Unit ID must be a valid UUID' })
  unitId: string;
}

export class ShortlistItemDto {
  @ApiProperty({ description: 'Shortlist item ID' })
  id: string;

  @ApiProperty({ description: 'Unit ID' })
  unitId: string;

  @ApiProperty({ description: 'Date when unit was added to shortlist' })
  createdAt: Date;

  @ApiProperty({ description: 'Unit details' })
  unit: {
    id: string;
    unitNumber: string;
    unitType: string;
    floor: number | null;
    size: number;
    bedrooms: number;
    bathrooms: number;
    price: number;
    launchPrice: number | null;
    status: string;
    description: string | null;
    floorPlanUrl: string | null;
    imageUrls: any;
    features: any;
    project: {
      id: string;
      name: string;
      slug: string;
      developer: string;
      location: string | null;
    };
  };
}

export class ShortlistResponseDto {
  @ApiProperty({ description: 'List of shortlisted units' })
  data: ShortlistItemDto[];

  @ApiProperty({ description: 'Total number of items in shortlist' })
  total: number;
}

