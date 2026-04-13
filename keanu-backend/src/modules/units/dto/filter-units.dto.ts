import { IsOptional, IsString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum UnitStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  UNAVAILABLE = 'UNAVAILABLE',
  LOCKED = 'LOCKED',
}

export class FilterUnitsDto {
  @ApiPropertyOptional({ 
    description: 'Filter by unit type (e.g., VILLA, 1BR, 2BR)',
    example: 'VILLA'
  })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: UnitStatus,
    isArray: true,
    example: ['AVAILABLE', 'RESERVED', 'SOLD']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UnitStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim());
    }
    return value;
  })
  status?: UnitStatus[];

  @ApiPropertyOptional({ 
    description: 'Filter by project ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  projectId?: string;
    @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  includeDeleted?: boolean;
}

