import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GHLOAuthService } from './ghl-oauth.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AppError } from '../../../common/exceptions/app-error';

@ApiTags('integrations')
@Controller('v1/integrations/ghl')
export class GHLOAuthController {
  constructor(
    private readonly ghlOAuthService: GHLOAuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('oauth/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GHL installation/authorization initiation (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns GHL authorization URL',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            authorizationUrl: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async authorize(@CurrentUser() user: any) {
    if (!user || !user.id) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
    }

    try {
      const authUrl = await this.ghlOAuthService.generateAuthorizationUrl(user.id);
      return {
        success: true,
        data: {
          authorizationUrl: authUrl,
        },
      };
    } catch (error: any) {
      // If it's already an AppError, let it propagate (will be caught by filter)
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle other errors - return proper format for frontend
      throw new AppError(
        error.message || 'Failed to initiate GHL authorization',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.code || 'GHL_AUTHORIZATION_FAILED',
      );
    }
  }

  @Get('oauth/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check GHL integration status' })
  @ApiResponse({ status: 200, description: 'Integration status retrieved successfully' })
  async status(@CurrentUser() user: any) {
    const status = await this.ghlOAuthService.getIntegrationStatus(user.id);

    return {
      success: true,
      data: status,
    };
  }

  @Delete('oauth/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect GHL integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected successfully' })
  async disconnect(@CurrentUser() user: any) {
    await this.ghlOAuthService.disconnectIntegration(user.id);

    return {
      success: true,
      message: 'GHL integration disconnected successfully',
    };
  }
}

