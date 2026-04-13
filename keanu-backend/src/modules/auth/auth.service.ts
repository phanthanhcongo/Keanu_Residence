import { Injectable, Inject, Optional, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordRequestDto, ForgotPasswordVerifyOtpDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { EmailService } from '../notifications/email.service';
import { throwError } from '../../common/utils/error.utils';
import { GHLContactService, GHLEventType } from '../integrations/ghl/ghl-contact.service';
import { GeolocationService } from '../../common/services/geolocation.service';
import { getClientIp } from '../../common/utils/ip.utils';
import { ActivityLogService } from '../../common/services/activity-log.service';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private config: ConfigService,
    private readonly geolocationService: GeolocationService,
    private readonly activityLogService: ActivityLogService,
    @Optional() private readonly ghlContactService?: GHLContactService,
  ) { }

  /**
   * Upsert GHL contact asynchronously (non-blocking)
   * Called after:
   * - Registration (with email and interest)
   * - OTP verification (update with verified status)
   * - Profile completion/update (update with full profile data)
   */
  private async upsertGHLContactAsync(userId: string, eventType?: GHLEventType | GHLEventType[], metadata?: { unitId?: string;[key: string]: any }) {
    if (!this.ghlContactService) {
      return; // Service not available, skip
    }

    try {
      // Upsert contact - service will fetch user data from database
      await this.ghlContactService.upsertContactFromUser(userId, undefined, eventType, metadata);
    } catch (error) {
      // Silently fail - don't block user operations
      console.error('GHL contact upsert failed:', error);
    }
  }

  async register(registerDto: RegisterDto, req?: Request) {
    const { email, password, confirmPassword, phoneNumber, referral, firstName, lastName, interest } = registerDto;

    // Validate password match
    if (password !== confirmPassword) {
      throwError('PASSWORD_MISMATCH', 'Password confirmation does not match');
    }

    // Auto-detect country from IP address
    let detectedCountry: string | null = null;
    if (req) {
      const clientIp = getClientIp(req);
      if (clientIp) {
        try {
          const geoData = await this.geolocationService.getCountryFromIp(clientIp);
          if (geoData?.country) {
            detectedCountry = geoData.country;
            console.log('Auto-detected country from IP:', {
              ip: clientIp,
              country: detectedCountry,
              countryCode: geoData.countryCode,
            });
          }
        } catch (error) {
          console.error('Failed to detect country from IP:', error);
          // Continue registration even if geolocation fails
        }
      }
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    // Check if account is locked (INACTIVE or soft-deleted)
    if (existingUser && (existingUser.isDeleted || existingUser.status === 'INACTIVE')) {
      throwError('ACCOUNT_LOCKED', 'Your account has been locked');
    }

    // Check if phone number already exists (only block if it belongs to a different email)
    if (phoneNumber) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (existingPhone && existingPhone.email !== email) {
        throwError('PHONE_ALREADY_EXISTS', 'Phone number is already in use');
      }
    }

    // Case 3: Account exists and is already verified — block registration
    if (existingUser && existingUser.isVerified) {
      throwError('EMAIL_ALREADY_EXISTS', 'Email is already in use. Please login.');
    }

    let user: { id: string; email: string | null; role: string };
    let isNewUser = false;

    // Case 2: Account exists but not yet verified — update info and re-send OTP
    if (existingUser && !existingUser.isVerified) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          phoneNumber: phoneNumber || null,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          interest: interest || existingUser.interest,
          country: detectedCountry || existingUser.country,
          referral: referral || existingUser.referral,
          // isVerified stays false — user must complete OTP
        },
        select: { id: true, email: true, role: true },
      });
    } else {
      // Case 1: Brand new account — create unverified
      isNewUser = true;
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          phoneNumber: phoneNumber || null,
          firstName: firstName || null,
          lastName: lastName || null,
          interest: interest || null,
          referral: referral || null,
          role: 'BUYER',
          isVerified: false, // Must verify via OTP
          country: detectedCountry,
        },
        select: { id: true, email: true, role: true },
      });

      // Upsert GHL contact for brand new signups (async, non-blocking)
      const metadata = referral ? { referral } : undefined;
      this.upsertGHLContactAsync(user.id, 'signup', metadata).catch((error) => {
        console.error('Failed to upsert GHL contact after registration:', error);
      });
    }

    // ----------------------------------------------------------------
    // OTP Flow — check if an active OTP already exists for this user.
    // If yes, skip creating a new one (avoid rate-limit collisions).
    // If no, generate a fresh OTP and send the email.
    // ----------------------------------------------------------------
    const trimmedEmail = email.trim().toLowerCase();

    const activeOtp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: trimmedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let otpExpiresAt: Date;

    if (activeOtp) {
      // An unexpired OTP already exists — reuse its expiry and skip email
      otpExpiresAt = activeOtp.expiresAt;
      console.log('Active OTP already exists for', trimmedEmail, '— skipping new OTP send');
    } else {
      // Delete any old unverified OTPs for this user
      await this.prisma.emailOtp.deleteMany({
        where: { userId: user.id, email: trimmedEmail, verified: false },
      });

      // Generate new OTP (2-minute expiry)
      const otpCode = this.generateOtp();
      otpExpiresAt = new Date();
      otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 2);

      await this.prisma.emailOtp.create({
        data: {
          userId: user.id,
          code: otpCode,
          email: trimmedEmail,
          expiresAt: otpExpiresAt,
          verified: false,
          attempts: 0,
        },
      });

      // Send OTP email
      try {
        await this.emailService.sendOtpEmail(trimmedEmail, otpCode);
      } catch (error) {
        console.error('Failed to send OTP email during registration:', error);
        // Clean up the OTP record so the user can retry
        await this.prisma.emailOtp.deleteMany({
          where: { userId: user.id, email: trimmedEmail, code: otpCode, verified: false },
        });
        const errorMessage = error?.message || 'Unable to send OTP email. Please try again.';
        throwError('EMAIL_SEND_FAILED', errorMessage);
      }
    }

    return {
      requiresOtpVerification: true,
      email: user.email,
      otpExpiresAt: otpExpiresAt.toISOString(),
      message: isNewUser
        ? 'Account created! Please check your email for the OTP verification code.'
        : 'OTP sent to your email. Please verify your account.',
    };
  }

  async resendOtp(email: string) {
    // Validate email parameter
    if (!email || typeof email !== 'string' || !email.trim()) {
      throwError('REQUIRED_FIELD_MISSING', 'Email is required');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      throwError('EMAIL_NOT_FOUND', 'Email does not exist in the system');
    }

    if (user.isVerified) {
      throwError('ACCOUNT_ALREADY_VERIFIED', 'Account is already verified');
    }

    // Check if there's an active OTP (not expired and not verified)
    const activeOtp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: trimmedEmail,
        verified: false,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (activeOtp) {
      const remainingSeconds = Math.ceil((activeOtp.expiresAt.getTime() - new Date().getTime()) / 1000);
      throwError(
        'OTP_RATE_LIMIT_EXCEEDED',
        `Please wait ${remainingSeconds} more seconds before requesting a new OTP code. The current OTP is still valid.`
      );
    }

    // Delete all old OTPs for this user (not verified) before creating new OTP
    await this.prisma.emailOtp.deleteMany({
      where: {
        userId: user.id,
        email: trimmedEmail,
        verified: false,
      },
    });

    // Generate new OTP
    const otpCode = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2); // OTP expires after 2 minutes

    // Save new OTP to database
    try {
      await this.prisma.emailOtp.create({
        data: {
          userId: user.id,
          code: otpCode,
          email: trimmedEmail,
          expiresAt,
          verified: false,
          attempts: 0,
        },
      });
    } catch (error) {
      console.error('Failed to create OTP in database:', error);
      // If it's a Prisma unique constraint violation
      if (error?.code === 'P2002') {
        throwError('DATABASE_ERROR', 'Failed to create OTP due to database constraint. Please try again.');
      }
      // For any other database error
      const errorMessage = error?.message || 'Failed to create OTP. Please try again.';
      throwError('DATABASE_ERROR', errorMessage);
    }

    // Send OTP email
    try {
      await this.emailService.sendOtpEmail(trimmedEmail, otpCode);
      return {
        message: 'New OTP has been sent to your email',
        otpExpiresAt: expiresAt.toISOString(), // Return OTP expiration time
      };
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      // Delete created OTP if email sending fails
      await this.prisma.emailOtp.deleteMany({
        where: {
          userId: user.id,
          email: trimmedEmail,
          code: otpCode,
          verified: false,
        },
      });
      const errorMessage = error?.message || 'Unable to send email. Please check SMTP configuration.';
      throwError('EMAIL_SEND_FAILED', errorMessage);
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, code } = verifyOtpDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throwError('EMAIL_NOT_FOUND', 'Email does not exist in the system');
    }

    // Check if account is locked (deleted or INACTIVE)
    if (user.isDeleted || user.status === 'INACTIVE') {
      throwError('ACCOUNT_LOCKED', 'Your account has been locked');
    }

    if (user.isVerified) {
      throwError('ACCOUNT_ALREADY_VERIFIED', 'Account is already verified');
    }

    // Clean up expired OTPs before verification
    await this.cleanupExpiredOtps(user.id, email);

    // Find OTP that is not verified and not expired
    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: email,
        code: code,
        verified: false,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the latest OTP
      },
    });

    if (!otp) {
      // Increment attempts for remaining OTPs (if any)
      await this.prisma.emailOtp.updateMany({
        where: {
          userId: user.id,
          email: email,
          verified: false,
          expiresAt: {
            gt: new Date(), // Only increment attempts for non-expired OTPs
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throwError('OTP_INVALID', 'OTP code is invalid or has expired');
    }

    // Check number of attempts (max 5 attempts)
    if (otp.attempts >= 5) {
      throwError('OTP_ATTEMPTS_EXCEEDED', 'Maximum attempts exceeded. Please request a new OTP code.');
    }

    // Mark OTP as verified
    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Update user as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        interest: true,
        isVerified: true,
        profileCompletionSkipped: true,
      },
    });

    // Upsert GHL contact after OTP verification (async, non-blocking)
    // Add completedProfile tag since user has completed registration with name and phone
    this.upsertGHLContactAsync(user.id, 'completedProfile').catch((error) => {
      // Log error but don't fail OTP verification
      console.error('Failed to upsert GHL contact after OTP verification:', error);
    });

    // Send welcome email after first successful OTP verification (async, non-blocking)
    // Do not block activation/login flow if email delivery fails.
    if (updatedUser.email) {
      this.emailService
        .sendWelcomeEmail(updatedUser.email, updatedUser.firstName || undefined)
        .catch((error) => {
          console.error('Failed to send welcome email after OTP verification:', error);
        });
    }

    // Check if profile is completed
    const profileCompleted = !!(
      updatedUser.firstName &&
      updatedUser.lastName &&
      updatedUser.phoneNumber &&
      updatedUser.dateOfBirth &&
      updatedUser.gender &&
      updatedUser.address &&
      updatedUser.city &&
      updatedUser.country
    );

    // Generate tokens (access token + refresh token) for auto-login
    if (!updatedUser.email) {
      throwError('UNAUTHORIZED', 'User email not found');
    }

    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: user.role,
    };

    const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = await this.getTokens(payload);

    // Save refresh token to database
    await this.saveRefreshToken(updatedUser.id, refreshToken, refreshExpiresAt);

    // Mark user as online
    try {
      // Use require to avoid circular dependency and TypeScript module resolution issues
      // This is safe because AdminService is a static class with static methods
      const AdminServiceModule = require('../admin/admin.service');
      const AdminService = AdminServiceModule.AdminService;
      if (AdminService && typeof AdminService.markUserOnline === 'function') {
        AdminService.markUserOnline(updatedUser.id);
      }
    } catch (error) {
      // Don't fail login if online tracking fails
      console.error('Failed to mark user online:', error);
    }

    // Log login activity
    this.activityLogService.createActivityLog({
      userId: updatedUser.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: updatedUser.id,
      metadata: { method: 'otp' },
    }).catch(err => console.error('Failed to log login activity:', err));

    return {
      message: 'Verification successful! Your account has been activated.',
      accessToken,
      refreshToken, // Trả về để controller set vào cookie
      expiresAt: accessExpiresAt.toISOString(),
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        avatarStorage: updatedUser.avatarUrl ? (updatedUser.avatarUrl.includes('cloudinary.com') ? 'cloudinary' : 'local') : null,
        role: user.role,
        isVerified: updatedUser.isVerified,
        profileCompleted,
        profileCompletionSkipped: updatedUser.profileCompletionSkipped,
      },
    };
  }

  /**
   * Delete expired OTPs for a user
   */
  private async cleanupExpiredOtps(userId: string, email: string): Promise<void> {
    await this.prisma.emailOtp.deleteMany({
      where: {
        userId,
        email,
        verified: false,
        expiresAt: {
          lte: new Date(), // Expired
        },
      },
    });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email with profile fields
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isVerified: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        avatarUrl: true,
        profileCompletionSkipped: true,
        isDeleted: true,
        status: true,
      },
    });

    if (!user) {
      throwError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if account is locked (deleted or INACTIVE)
    if (user.isDeleted || user.status === 'INACTIVE') {
      throwError('ACCOUNT_LOCKED', 'Your account has been locked');
    }

    // Check password
    if (!user.password) {
      throwError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throwError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check email exists
    if (!user.email) {
      throwError('UNAUTHORIZED', 'User email not found');
    }

    // Check if user is verified — if not, send OTP and require verification
    if (!user.isVerified) {
      const trimmedEmail = user.email.trim().toLowerCase();

      const activeOtp = await this.prisma.emailOtp.findFirst({
        where: {
          userId: user.id,
          email: trimmedEmail,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      let otpExpiresAt: Date;

      if (activeOtp) {
        otpExpiresAt = activeOtp.expiresAt;
        console.log('Active OTP already exists for', trimmedEmail, '— skipping new OTP send');
      } else {
        // Delete any old unverified OTPs for this user
        await this.prisma.emailOtp.deleteMany({
          where: { userId: user.id, email: trimmedEmail, verified: false },
        });

        // Generate new OTP (2-minute expiry)
        const otpCode = this.generateOtp();
        otpExpiresAt = new Date();
        otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 2);

        await this.prisma.emailOtp.create({
          data: {
            userId: user.id,
            code: otpCode,
            email: trimmedEmail,
            expiresAt: otpExpiresAt,
            verified: false,
            attempts: 0,
          },
        });

        // Send OTP email
        try {
          await this.emailService.sendOtpEmail(trimmedEmail, otpCode);
        } catch (error) {
          console.error('Failed to send OTP email during login:', error);
          await this.prisma.emailOtp.deleteMany({
            where: { userId: user.id, email: trimmedEmail, code: otpCode, verified: false },
          });
          const errorMessage = error?.message || 'Unable to send OTP email. Please try again.';
          throwError('EMAIL_SEND_FAILED', errorMessage);
        }
      }

      return {
        requiresOtpVerification: true,
        email: user.email,
        otpExpiresAt: otpExpiresAt.toISOString(),
        message: 'Your account is not verified. Please check your email for the OTP verification code.',
      };
    }

    // Check if profile is completed
    const profileCompleted = !!(
      user.firstName &&
      user.lastName &&
      user.phoneNumber &&
      user.dateOfBirth &&
      user.gender &&
      user.address &&
      user.city &&
      user.country
    );

    // Generate tokens (access token + refresh token)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate both access token and refresh token
    const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = await this.getTokens(payload);

    // Save refresh token to database
    await this.saveRefreshToken(user.id, refreshToken, refreshExpiresAt);

    // Mark user as online
    try {
      // Use require to avoid circular dependency and TypeScript module resolution issues
      // This is safe because AdminService is a static class with static methods
      const AdminServiceModule = require('../admin/admin.service');
      const AdminService = AdminServiceModule.AdminService;
      if (AdminService && typeof AdminService.markUserOnline === 'function') {
        AdminService.markUserOnline(user.id);
      }
    } catch (error) {
      // Don't fail login if online tracking fails
      console.error('Failed to mark user online:', error);
    }

    // Log login activity
    this.activityLogService.createActivityLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      metadata: { method: 'password' },
    }).catch(err => console.error('Failed to log login activity:', err));

    // Upsert GHL contact after login (async, non-blocking)
    this.upsertGHLContactAsync(user.id, 'login').catch((error) => {
      // Log error but don't fail login
      console.error('Failed to upsert GHL contact after login:', error);
    });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken, // Trả về để controller set vào cookie
      expiresAt: accessExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        avatarStorage: user.avatarUrl ? (user.avatarUrl.includes('cloudinary.com') ? 'cloudinary' : 'local') : null,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted,
        profileCompletionSkipped: user.profileCompletionSkipped,
      },
    };
  }

  async verifySession(token: string) {
    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token);

      // Find user from payload
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isVerified: true,
          avatarUrl: true,
          profileCompletionSkipped: true,
          referral: true, // Include referral for UTM tracking
          isDeleted: true,
        },
      });

      if (!user) {
        throwError('UNAUTHORIZED', 'User does not exist');
      }

      // Check if user is deleted
      if (user.isDeleted) {
        throwError('UNAUTHORIZED', 'The account does not exist');
      }

      return {
        ...user,
        avatarStorage: user.avatarUrl ? (user.avatarUrl.includes('cloudinary.com') ? 'cloudinary' : 'local') : null
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throwError('TOKEN_EXPIRED', 'Token is invalid or has expired');
      }
      throw error;
    }
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throwError('PASSWORD_MISMATCH', 'New password confirmation does not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throwError('USER_NOT_FOUND', 'User not found');
    if (!user.password) throwError('UNAUTHORIZED', 'User does not have a password set');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) throwError('INVALID_CREDENTIALS', 'Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async logout(refreshToken?: string, userIdFromAccessToken?: string) {
    let userId: string | undefined = userIdFromAccessToken;
    console.log('[Logout Service] userIdFromAccessToken:', userIdFromAccessToken);
    console.log('[Logout Service] refreshToken provided:', !!refreshToken);

    // Remove refresh token from database if refreshToken is provided
    if (refreshToken) {
      try {
        // Verify token to get user ID
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        });
        // Use userId from refresh token if we don't have it from access token
        if (!userId) {
          userId = payload.sub;
          console.log('[Logout Service] UserId from refresh token:', userId);
        }
        if (userId) {
          await this.removeRefreshToken(userId);
        }
      } catch (error) {
        // Ignore errors when verifying token (token might be invalid/expired)
        console.log('[Logout Service] Failed to verify refresh token:', error instanceof Error ? error.message : 'unknown error');
      }
    }

    console.log('[Logout Service] Final userId to mark offline:', userId);

    // Mark user as offline (use userId from access token or refresh token)
    if (userId) {
      try {
        // Use require to avoid circular dependency and TypeScript module resolution issues
        // This is safe because AdminService is a static class with static methods
        const AdminServiceModule = require('../admin/admin.service');
        const AdminService = AdminServiceModule.AdminService;
        if (AdminService && typeof AdminService.markUserOffline === 'function') {
          console.log('[Logout Service] Calling markUserOffline for userId:', userId);
          AdminService.markUserOffline(userId);
        } else {
          console.error('[Logout Service] AdminService or markUserOffline not found');
        }
      } catch (error) {
        // Don't fail logout if online tracking fails
        console.error('[Logout Service] Failed to mark user offline:', error);
      }
    } else {
      console.warn('[Logout Service] No userId found from access token or refresh token. User may not be marked offline.');
    }

    // Frontend will automatically delete token from localStorage
    return {
      message: 'Logout successful',
    };
  }

  async forgotPasswordRequest(dto: ForgotPasswordRequestDto) {
    const { email } = dto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throwError('EMAIL_NOT_FOUND', 'Email does not exist in the system');
    }

    // Only allow password reset if account is verified
    if (!user.isVerified) {
      throwError('ACCOUNT_NOT_VERIFIED', 'Account is not verified. Please verify your account first.');
    }

    // Check if there's an active OTP that hasn't expired yet
    const activeOtp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: email,
        verified: false,
        expiresAt: {
          gt: new Date(), // Not expired yet
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent OTP
      },
    });

    if (activeOtp) {
      // Calculate remaining time in seconds
      const now = new Date();
      const remainingSeconds = Math.floor((activeOtp.expiresAt.getTime() - now.getTime()) / 1000);

      // Throw error with details in the exception
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_ALREADY_SENT',
          message: 'An OTP code has already been sent.',
          details: {
            otpExpiresAt: activeOtp.expiresAt.toISOString(),
            remainingSeconds,
          },
        },
      });
    }

    // Delete old expired OTPs (not verified) before creating new one
    await this.prisma.emailOtp.deleteMany({
      where: {
        userId: user.id,
        email: email,
        verified: false,
        expiresAt: {
          lte: new Date(), // Expired
        },
      },
    });

    // Generate new OTP
    const otpCode = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2); // OTP expires after 2 minutes

    // Save OTP to database
    await this.prisma.emailOtp.create({
      data: {
        userId: user.id,
        code: otpCode,
        email: email,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    // Send OTP via email
    try {
      await this.emailService.sendResetPasswordOtpEmail(email, otpCode);
    } catch (error) {
      console.error('Failed to send reset password OTP email:', error);
      throwError('EMAIL_SEND_FAILED', 'Unable to send email. Please try again later.');
    }

    return {
      message: 'OTP code has been sent to your email. Please check your email.',
      otpExpiresAt: expiresAt.toISOString(),
    };
  }

  async forgotPasswordVerifyOtp(dto: ForgotPasswordVerifyOtpDto) {
    const { email, code } = dto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throwError('EMAIL_NOT_FOUND', 'Email does not exist in the system');
    }

    // Delete expired OTPs
    await this.prisma.emailOtp.deleteMany({
      where: {
        userId: user.id,
        email: email,
        verified: false,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    // Find OTP that is not verified and not expired
    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: email,
        code: code,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      // Increment attempts
      await this.prisma.emailOtp.updateMany({
        where: {
          userId: user.id,
          email: email,
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throwError('OTP_INVALID', 'OTP code is invalid or has expired');
    }

    // Check number of attempts
    if (otp.attempts >= 5) {
      throwError('OTP_ATTEMPTS_EXCEEDED', 'Maximum attempts exceeded. Please request a new OTP code.');
    }

    // Mark OTP as verified
    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return {
      message: 'OTP verification successful. You can now reset your password.',
      verified: true,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, newPassword, confirmPassword } = dto;

    // Validate password match
    if (newPassword !== confirmPassword) {
      throwError('PASSWORD_MISMATCH', 'Password confirmation does not match');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throwError('EMAIL_NOT_FOUND', 'Email does not exist in the system');
    }

    // Check if OTP has been verified
    const verifiedOtp = await this.prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        email: email,
        code: code,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verifiedOtp) {
      throwError('OTP_INVALID', 'OTP code has not been verified. Please verify OTP first.');
    }

    // Check if OTP is not too old (max 30 minutes)
    const otpAge = new Date().getTime() - verifiedOtp.createdAt.getTime();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    if (otpAge > maxAge) {
      throwError('OTP_EXPIRED', 'OTP code has expired. Please request a new OTP code.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete all verified OTPs for this user (to prevent reuse)
    await this.prisma.emailOtp.deleteMany({
      where: {
        userId: user.id,
        email: email,
        verified: true,
      },
    });

    return {
      message: 'Password reset successful. You can now login with your new password.',
    };
  }

  private generateOtp(): string {
    // Generate 6-digit OTP code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Parse JWT expiration string (e.g., '30s', '15m', '1h', '7d') to milliseconds
   */
  private parseExpiresInToMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 30 seconds if format is invalid
      return 30 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 1000;
    }
  }

  /**
   * Get access token TTL from config (single source of truth)
   */
  private getAccessTokenExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
  }

  /**
   * Get refresh token TTL from config (single source of truth)
   */
  private getRefreshTokenExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  /**
 * Generate Access Token and Refresh Token
 */
  private async getTokens(payload: { sub: string; email: string; role: string }) {
    const accessExpiresIn = this.getAccessTokenExpiresIn();
    const refreshExpiresIn = this.getRefreshTokenExpiresIn();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    // Thời gian hết hạn token (FE dùng) - sync với config
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + this.parseExpiresInToMs(accessExpiresIn));
    const refreshExpiresAt = new Date(now.getTime() + this.parseExpiresInToMs(refreshExpiresIn));

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  /**
   * Save hashed Refresh Token to database
   */
  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: refreshExpiresAt,
      },
    });
  }

  /**
   * Remove Refresh Token (used in logout)
   */
  private async removeRefreshToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user from payload
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          refreshTokenHash: true,
          refreshTokenExpiresAt: true,
          isDeleted: true,
        },
      });

      if (!user) {
        throwError('UNAUTHORIZED', 'User does not exist');
      }

      // Check if user is deleted
      if (user.isDeleted) {
        throwError('UNAUTHORIZED', 'The account does not exist.');
      }

      // Check if refresh token exists in database
      if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
        throwError('UNAUTHORIZED', 'Refresh token not found');
      }

      // Check if refresh token has expired
      if (new Date() > user.refreshTokenExpiresAt) {
        throwError('TOKEN_EXPIRED', 'Refresh token has expired');
      }

      // Verify refresh token hash matches stored hash
      const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isTokenValid) {
        throwError('UNAUTHORIZED', 'Invalid refresh token');
      }

      // Generate new tokens
      if (!user.email) {
        throwError('UNAUTHORIZED', 'User email not found');
      }

      const tokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const { accessToken, refreshToken: newRefreshToken, accessExpiresAt, refreshExpiresAt } = await this.getTokens(tokenPayload);

      // Save new refresh token
      await this.saveRefreshToken(user.id, newRefreshToken, refreshExpiresAt);

      return {
        accessToken,
        expiresAt: accessExpiresAt.toISOString(),
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throwError('TOKEN_EXPIRED', 'Refresh token is invalid or has expired');
      }
      throw error;
    }
  }

}
