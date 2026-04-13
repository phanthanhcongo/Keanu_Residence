import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

export enum AdminEditableUserRole {
  BUYER = 'BUYER',
  ADMIN = 'ADMIN',
  SALES = 'SALES',
}

export class ListUsersDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or phone number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AdminEditableUserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(AdminEditableUserRole)
  role?: AdminEditableUserRole;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

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

export class UpdateUserRoleDto {
  @ApiPropertyOptional({
    enum: AdminEditableUserRole,
    description: 'User role. SUPER_ADMIN cannot be set through admin edit.',
    example: AdminEditableUserRole.SALES
  })
  @IsEnum(AdminEditableUserRole)
  role: AdminEditableUserRole;
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: UserStatus, description: 'Account status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Lock/unlock user account' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Verify/unverify user' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class CreateUserDto {
  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  password: string;

  @IsEnum(AdminEditableUserRole)
  role: AdminEditableUserRole;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean = false;
}

