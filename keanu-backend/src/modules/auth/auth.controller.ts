import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Headers,
  Get,
  Req,
  Res,
  UnauthorizedException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  ForgotPasswordRequestDto,
  ForgotPasswordVerifyOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import type { Request, Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'OTP sent — user must verify email' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: RegisterDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ) {
    // Register no longer issues tokens. It creates (or updates) the user as
    // unverified and sends an OTP email. The frontend must redirect to /otp-verify.
    const result = await this.authService.register(registerDto, req);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // If user is not verified, return OTP response without setting cookies
    if ('requiresOtpVerification' in result && result.requiresOtpVerification) {
      return result;
    }

    const { accessToken, refreshToken, expiresAt, user } = result;

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    // Set refresh token in cookie (httpOnly, secure in production)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refresh token (only in cookie)
    return {
      message: 'Login successful',
      accessToken,
      expiresAt,
      user,
    };
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, expiresAt, user } = await this.authService.verifyOtp(verifyOtpDto);

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    // Set refresh token in cookie (httpOnly, secure in production)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refresh token (only in cookie)
    return {
      message: 'Verification successful! Your account has been activated.',
      accessToken,
      expiresAt,
      user,
    };
  }

  @Post('resend-otp')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto.email);
  }

  @Post('forgot-password/request')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPasswordRequest(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPasswordRequest(dto);
  }

  @Post('forgot-password/verify-otp')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPasswordVerifyOtp(@Body() dto: ForgotPasswordVerifyOtpDto) {
    return this.authService.forgotPasswordVerifyOtp(dto);
  }

  @Post('forgot-password/reset')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('password')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: UpdatePasswordDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Headers('authorization') authHeader?: string) {
    const token =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader || undefined;

    if (!token) {
      throw new UnauthorizedException('Token is not provided');
    }

    return this.authService.verifySession(token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.['refresh_token'];
    console.log('[Logout] Refresh token from cookie:', refreshToken ? 'exists' : 'not found');

    // Try to get userId from access token in Authorization header
    let userIdFromAccessToken: string | undefined;
    try {
      const authHeader = req.headers.authorization;
      console.log('[Logout] Authorization header:', authHeader ? 'exists' : 'not found');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || this.configService.get<string>('JWT_SECRET');
        if (secret) {
          const payload = this.jwtService.verify(accessToken, {
            secret,
          });
          userIdFromAccessToken = payload.sub;
          console.log('[Logout] UserId from access token:', userIdFromAccessToken);
        }
      }
    } catch (error) {
      // Ignore errors - token might be expired or invalid
      console.log('[Logout] Failed to get userId from access token:', error instanceof Error ? error.message : 'unknown error');
    }

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });

    // Remove refresh token from database and mark user offline
    // Pass both refreshToken and userIdFromAccessToken
    return this.authService.logout(refreshToken, userIdFromAccessToken);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is not provided');
    }

    const {
      accessToken,
      expiresAt,
      refreshToken: newRt,
    } = await this.authService.refreshTokens(refreshToken);

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    // Rotate refresh token
    res.cookie('refresh_token', newRt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, expiresAt };
  }
}
