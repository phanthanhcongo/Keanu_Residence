import { IsOptional, IsString, IsEnum, IsInt, IsNumber, IsArray, Min, Max, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { UnitStatus } from '@prisma/client';

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsString()
  unitNumber: string;

  @ApiProperty()
  @IsString()
  unitType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiProperty()
  @IsNumber()
  size: number;

  @ApiProperty()
  @IsInt()
  bedrooms: number;

  @ApiProperty()
  @IsNumber()
  bathrooms: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  launchPrice?: number;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorPlanUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  features?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  xPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  yPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  shortlistCount?: number;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string; // Allow changing project when updating unit

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  launchPrice?: number;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorPlanUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  features?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  xPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  yPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  shortlistCount?: number;
}

export class ListUnitsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

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
  includeDeleted?: boolean = false;
}

