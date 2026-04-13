import { IsOptional, IsString, IsEmail, IsDateString, IsUrl, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+84901234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-01-01', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Male', description: 'Gender' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh City', description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Vietnam', description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Avatar URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ 
    example: 'buying_to_live', 
    description: 'User interest type',
    enum: ['buying_to_live', 'buying_as_investment', 'buying_for_holiday', 'not_a_buyer']
  })
  @IsOptional()
  @IsString()
  @IsIn(['buying_to_live', 'buying_as_investment', 'buying_for_holiday', 'not_a_buyer'], {
    message: 'Interest must be one of: buying_to_live, buying_as_investment, buying_for_holiday, not_a_buyer'
  })
  interest?: string;
}

