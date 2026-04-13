import { Injectable, NotFoundException, ConflictException, Optional, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import { GHLContactService, GHLEventType } from '../integrations/ghl/ghl-contact.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    @Optional() private readonly ghlContactService?: GHLContactService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        profileCompletionSkipped: true,
        referral: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      avatarStorage: user.avatarUrl ? (user.avatarUrl.includes('cloudinary.com') ? 'cloudinary' : 'local') : null
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto, avatarFile?: Express.Multer.File) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateProfileDto.email && updateProfileDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });
      if (emailExists) throw new ConflictException('Email is already in use');
    }

    if (updateProfileDto.phoneNumber && updateProfileDto.phoneNumber !== existingUser.phoneNumber) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phoneNumber: updateProfileDto.phoneNumber },
      });
      if (phoneExists) throw new ConflictException('Phone number is already in use');
    }

    // Handle avatar file upload if provided
    let uploadedIsCloudinary = false;
    if (avatarFile) {
      try {
        const { url, isCloudinary } = await this.saveAvatar(userId, avatarFile);
        uploadedIsCloudinary = isCloudinary;
        // Delete old avatar if file is uploaded successfully
        if (existingUser.avatarUrl) {
          await this.deleteAvatar(existingUser.avatarUrl);
        }
        
        updateProfileDto.avatarUrl = url;
        console.log(`[AvatarUpdate] New file uploaded. Storage: ${isCloudinary ? 'Cloudinary' : 'Local'}, URL: ${url}`);
      } catch (error) {
        throw new InternalServerErrorException(`Failed to upload avatar: ${error.message}`);
      }
    } else if (updateProfileDto.avatarUrl !== undefined && updateProfileDto.avatarUrl !== existingUser.avatarUrl && existingUser.avatarUrl) {
      // If no new file is uploaded, but avatarUrl in DTO is changed or set to null
      // We should delete the old file as it's no longer used
      await this.deleteAvatar(existingUser.avatarUrl);
      console.log(`[AvatarUpdate] Existing avatar removed or replaced via URL update.`);
    }

    const updateData: any = {};
    const fields = ['phoneNumber', 'email', 'firstName', 'lastName', 'gender', 'address', 'city', 'country', 'avatarUrl', 'interest'];
    
    fields.forEach(field => {
      if (updateProfileDto[field] !== undefined) {
        updateData[field] = updateProfileDto[field] || null;
      }
    });

    if (updateProfileDto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = updateProfileDto.dateOfBirth ? new Date(updateProfileDto.dateOfBirth) : null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        avatarUrl: true,
        interest: true,
        role: true,
        isVerified: true,
        profileCompletionSkipped: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (this.ghlContactService) {
      const eventTypes: GHLEventType[] = [];
      if (updatedUser.interest) eventTypes.push(updatedUser.interest as GHLEventType);
      
      if (updatedUser.firstName && updatedUser.lastName && updatedUser.email && updatedUser.phoneNumber && updatedUser.interest && updatedUser.country) {
        eventTypes.push('completedProfile');
      }

      this.ghlContactService.upsertContactFromUser(userId, {
        email: updatedUser.email || undefined,
        firstName: updatedUser.firstName || undefined,
        lastName: updatedUser.lastName || undefined,
        phoneNumber: updatedUser.phoneNumber || undefined,
        dateOfBirth: updatedUser.dateOfBirth ? updatedUser.dateOfBirth.toISOString().split('T')[0] : undefined,
        gender: updatedUser.gender || undefined,
        address: updatedUser.address || undefined,
        city: updatedUser.city || undefined,
        country: updatedUser.country || undefined,
      }, eventTypes.length > 0 ? eventTypes : undefined).catch(e => console.error('GHL error:', e));
    }

    const result: any = { ...updatedUser };
    if (avatarFile) {
      result.avatarStorage = uploadedIsCloudinary ? 'cloudinary' : 'local';
    } else if (updatedUser.avatarUrl) {
      result.avatarStorage = updatedUser.avatarUrl.includes('cloudinary.com') ? 'cloudinary' : 'local';
    }

    return result;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    try {
      const { url, isCloudinary } = await this.saveAvatar(userId, file);

      // Update user's avatarUrl in database
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          city: true,
          country: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          profileCompletionSkipped: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (user.avatarUrl) {
        await this.deleteAvatar(user.avatarUrl);
      }
      return {
        ...updatedUser,
        avatarStorage: isCloudinary ? 'cloudinary' : 'local'
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to upload avatar: ${error.message}`);
    }
  }

  private async saveAvatar(userId: string, file: Express.Multer.File): Promise<{ url: string; isCloudinary: boolean }> {
    const config = {
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
      apiSecret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    };

    console.log('[DEBUG] Cloudinary Config on Server:');
    console.log(`- CLOUDINARY_CLOUD_NAME: ${config.cloudName ? (config.cloudName === 'your_cloud_name' ? 'STILL_DEFAULT' : 'EXISTS') : 'MISSING'}`);
    console.log(`- CLOUDINARY_API_KEY: ${config.apiKey ? 'EXISTS' : 'MISSING'}`);
    console.log(`- CLOUDINARY_API_SECRET: ${config.apiSecret ? 'EXISTS' : 'MISSING'}`);

    const missingVars: string[] = [];
    if (!config.cloudName || config.cloudName === 'your_cloud_name') missingVars.push('CLOUDINARY_CLOUD_NAME');
    if (!config.apiKey) missingVars.push('CLOUDINARY_API_KEY');
    if (!config.apiSecret) missingVars.push('CLOUDINARY_API_SECRET');

    if (missingVars.length > 0) {
      throw new InternalServerErrorException(
        `Cloudinary config error: Missing or invalid environment variables: [${missingVars.join(', ')}]. ` +
        `Current cloudName: "${config.cloudName || 'undefined'}". ` +
        `Please ensure these are set in your server's Environment Variables settings.`
      );
    }

    try {
      const result = await this.cloudinaryService.uploadImage(file, 'avatars');
      return { url: result.secure_url, isCloudinary: true };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error.message || 'Unknown error'}`);
    }
  }

  private async deleteAvatar(avatarUrl: string) {
    if (!avatarUrl) return;
    if (avatarUrl.includes('cloudinary.com')) {
      try {
        const parts = avatarUrl.split('/');
        const folderIndex = parts.indexOf('keanu');
        if (folderIndex !== -1) {
          const publicId = parts.slice(folderIndex).join('/').split('.')[0];
          await this.cloudinaryService.deleteImage(publicId);
          console.log(`[AvatarDelete] Successfully deleted from Cloudinary: ${publicId}`);
        }
      } catch (e) {
        console.error('[AvatarDelete] Cloudinary delete error:', e);
      }
    } else if (avatarUrl.includes('/uploads/avatars/')) {
      // await this.deleteLocalAvatar(avatarUrl);
    }
  }

  /*
  private async saveAvatarLocally(userId: string, file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const uploadDir = join(process.cwd(), 'uploads', 'avatars', userId);
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(join(uploadDir, fileName), file.buffer);
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:4000/api');
    const baseUrl = appUrl.replace('/api', '');
    return `${baseUrl}/uploads/avatars/${userId}/${fileName}`;
  }
  */

  /*
  private async deleteLocalAvatar(avatarUrl: string) {
    try {
      const urlParts = avatarUrl.split('/uploads/');
      if (urlParts.length < 2) return;
      await fs.unlink(join(process.cwd(), 'uploads', urlParts[1]));
    } catch (e) { console.error('Local delete error:', e); }
  }
  */

  async skipProfileCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileCompletionSkipped: true },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        profileCompletionSkipped: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
