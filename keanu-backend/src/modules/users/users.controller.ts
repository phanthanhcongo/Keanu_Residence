import { Controller, Get, Patch, Body, Post, UseGuards, UsePipes, ValidationPipe, UseInterceptors, UploadedFile, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AdminService } from '../admin/admin.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        dateOfBirth: { type: 'string', format: 'date' },
        gender: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        avatarUrl: { type: 'string' },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (optional, only for multipart/form-data)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or phone number already in use' })
  @UseInterceptors(FileInterceptor('avatar', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files, but file is optional
      if (file && !file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  @UsePipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true,
    skipMissingProperties: false,
  }))
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto, avatarFile);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.usersService.uploadAvatar(user.id, file);
  }

  @Post('profile/skip')
  @ApiOperation({ summary: 'Skip profile completion' })
  @ApiResponse({ status: 200, description: 'Profile completion skipped successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async skipProfileCompletion(@CurrentUser() user: CurrentUserPayload) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.skipProfileCompletion(user.id);
  }

  @Get('online-count')
  @ApiOperation({ summary: 'Get current online user count (available to all authenticated users)' })
  @ApiResponse({ status: 200, description: 'Online user count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOnlineUserCount() {
    const count = this.adminService.getOnlineUserCount();
    return {
      onlineUserCount: count,
    };
  }
}

