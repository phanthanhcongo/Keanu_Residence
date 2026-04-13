import { IsOptional, IsString, IsEnum, IsDateString, IsInt, IsNumber, IsArray, ValidateNested, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  developer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsDateString()
  launchDate: string;

  @ApiProperty()
  @IsString()
  launchTime: string;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policyUrl?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  reservationDuration?: number;

  @ApiProperty()
  @IsNumber()
  depositAmount: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  developer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  launchDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  launchTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  reservationDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ListProjectsDto {
  @ApiPropertyOptional({ description: 'Search by name or slug' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

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

