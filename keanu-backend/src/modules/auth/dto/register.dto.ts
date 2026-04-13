import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '+447700900000', description: 'User phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'password123', description: 'Password confirmation' })
  @IsString()
  confirmPassword: string;

  @ApiProperty({ 
    example: 'buying_to_live', 
    description: 'User interest/buyer intent (optional)', 
    required: false,
    enum: ['buying_to_live', 'buying_as_investment', 'buying_for_holiday', 'not_a_buyer']
  })
  @IsOptional()
  @IsString()
  interest?: string;

  @ApiProperty({ example: 'balibound', description: 'Registration referral source (optional)', required: false })
  @IsOptional()
  @IsString()
  referral?: string;
}

