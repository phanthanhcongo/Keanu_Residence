import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

