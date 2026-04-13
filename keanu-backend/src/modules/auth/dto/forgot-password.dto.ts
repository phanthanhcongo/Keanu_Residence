import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class ForgotPasswordVerifyOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP code must be 6 digits' })
  code: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP code must be 6 digits' })
  code: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @IsString()
  confirmPassword: string;
}

