import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { GHLOAuthService } from './ghl-oauth.service';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../../common/exceptions/app-error';

@ApiTags('integrations')
@Controller('v1/oauth')
export class GHLOAuthCallbackController {
  private readonly logger = new Logger(GHLOAuthCallbackController.name);

  constructor(
    private readonly ghlOAuthService: GHLOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: 'GHL OAuth callback after user authorizes' })
  @ApiQuery({ name: 'code', required: false, description: 'Authorization code' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter' })
  @ApiQuery({ name: 'error', required: false, description: 'Error message' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    // Handle OAuth error from GHL
    if (error) {
      this.logger.error('GHL OAuth error received', { error });
      return res.redirect(
        `${frontendUrl}/admin?ghl_error=${encodeURIComponent(error)}`,
      );
    }

    // Validate required parameters
    if (!code || !state) {
      this.logger.warn('Missing OAuth parameters', { hasCode: !!code, hasState: !!state });
      return res.redirect(
        `${frontendUrl}/admin?ghl_error=${encodeURIComponent('Missing authorization code or state parameter')}`,
      );
    }

    try {
      this.logger.log('Processing GHL OAuth callback', { hasCode: !!code, hasState: !!state });
      
      const result = await this.ghlOAuthService.handleCallback(code, state);
      
      // this.logger.log('GHL OAuth callback successful', {
      //   userId: result.userId,
      //   locationId: result.locationId,
      // });
      
      // Redirect to admin dashboard with success flag
      return res.redirect(`${frontendUrl}/admin?ghl_installed=true`);
    } catch (error: any) {
      // Log error with details
      this.logger.error('GHL OAuth callback error', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Extract error message from AppError or use default
      let errorMessage = 'Failed to connect GHL';
      if (error instanceof AppError) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return res.redirect(
        `${frontendUrl}/admin?ghl_error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }
}

