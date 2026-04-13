import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/exceptions/app-error';
import { encrypt, decrypt } from '../../../common/utils/encryption';
import { GHLApiClient } from './providers/ghl-api-client';

interface GHLTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  locationId?: string;
  companyId?: string;
  userId?: string;
}

interface OAuthState {
  userId: string;
  timestamp: number;
  nonce: string;
}

@Injectable()
export class GHLOAuthService {
  private readonly logger = new Logger(GHLOAuthService.name);
  private stateStore: Map<string, OAuthState> = new Map();
  private readonly stateExpiryMs = 10 * 60 * 1000; // 10 minutes

  private readonly ghlConfig = {
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    authorizationUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
    tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
    scopes: [
      'contacts.readonly',
      'contacts.write',
      'conversations/message.write',
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.ghlConfig.clientId = this.configService.get<string>('GHL_CLIENT_ID') || '';
    this.ghlConfig.clientSecret = this.configService.get<string>('GHL_CLIENT_SECRET') || '';

    // Build redirect URI - ensure no double /api in path
    const customRedirectUri = this.configService.get<string>('GHL_REDIRECT_URI');
    if (customRedirectUri) {
      this.ghlConfig.redirectUri = customRedirectUri;
    } else {
      let appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:4000';
      // Remove trailing slashes and any /api suffix
      appUrl = appUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
      this.ghlConfig.redirectUri = `${appUrl}/api/v1/oauth/callback`;
    }

    // Clean up expired states every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  async generateAuthorizationUrl(userId: string): Promise<string> {
    // Validate configuration
    if (!this.ghlConfig.clientId || !this.ghlConfig.clientSecret) {
      this.logger.error('GHL OAuth not configured', {
        hasClientId: !!this.ghlConfig.clientId,
        hasClientSecret: !!this.ghlConfig.clientSecret,
      });
      throw new AppError(
        'GHL OAuth not configured. Please set GHL_CLIENT_ID and GHL_CLIENT_SECRET environment variables.',
        500,
        'GHL_OAUTH_NOT_CONFIGURED',
      );
    }

    if (!this.ghlConfig.redirectUri) {
      this.logger.error('GHL redirect URI not configured');
      throw new AppError(
        'GHL redirect URI not configured. Please set GHL_REDIRECT_URI or APP_URL environment variable.',
        500,
        'GHL_REDIRECT_URI_NOT_CONFIGURED',
      );
    }

    const state = this.generateState(userId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.ghlConfig.clientId,
      redirect_uri: this.ghlConfig.redirectUri,
      scope: this.ghlConfig.scopes.join(' '),
      state,
    });

    const authUrl = `${this.ghlConfig.authorizationUrl}?${params.toString()}`;

    this.logger.log('Generated GHL authorization URL', {
      userId,
      state,
      redirectUri: this.ghlConfig.redirectUri,
      authorizationUrl: this.ghlConfig.authorizationUrl,
    });

    return authUrl;
  }

  async handleCallback(code: string, state: string): Promise<{ userId: string; locationId: string }> {
    this.logger.log('Handling GHL OAuth callback', {
      hasCode: !!code,
      hasState: !!state,
    });

    const stateData = this.validateState(state);
    if (!stateData) {
      this.logger.error('Invalid or expired state parameter', { state });
      throw new AppError('Invalid or expired state parameter', 400, 'INVALID_STATE');
    }

    const { userId } = stateData;

    // this.logger.log('State validated successfully', {
    //   userId,
    // });

    try {
      const tokens = await this.exchangeCodeForTokens(code);
      await this.saveTokens(userId, tokens);

      // this.logger.log('GHL OAuth tokens saved successfully', {
      //   userId,
      //   locationId: tokens.locationId,
      //   companyId: tokens.companyId,
      // });

      return {
        userId,
        locationId: tokens.locationId || '',
      };
    } catch (error: any) {
      this.logger.error('Failed to handle GHL OAuth callback', {
        userId,
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<GHLTokens> {
    try {
      this.logger.log('Exchanging GHL authorization code for tokens');

      const response = await axios.post(
        this.ghlConfig.tokenUrl,
        {
          grant_type: 'authorization_code',
          code,
          client_id: this.ghlConfig.clientId,
          client_secret: this.ghlConfig.clientSecret,
          redirect_uri: this.ghlConfig.redirectUri,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        },
      );

      const { access_token, refresh_token, expires_in, token_type, scope, locationId, companyId, userId } =
        response.data;

      // this.logger.log('Successfully exchanged GHL code for tokens', {
      //   expires_in,
      //   scope,
      //   has_location_id: !!locationId,
      //   has_company_id: !!companyId,
      // });

      return {
        access_token,
        refresh_token,
        expires_in,
        token_type,
        scope,
        locationId,
        companyId,
        userId,
      };
    } catch (error: any) {
      this.logger.error('Failed to exchange GHL authorization code', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new AppError('Failed to exchange authorization code', 500, 'OAUTH_EXCHANGE_FAILED');
    }
  }

  async getIntegrationStatus(userId: string): Promise<any> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        userId,
        providerName: 'ghl',
        isDeleted: false,
      },
    });

    if (!integration) {
      return {
        connected: false,
        status: 'not_configured',
      };
    }

    const credentials = decrypt((integration.credentials as any).encrypted) as any;
    const isExpired = credentials.expires_at && credentials.expires_at < Date.now();

    return {
      connected: integration.status === 'active',
      status: integration.status,
      locationId: credentials.location_id,
      companyId: credentials.company_id,
      tokenExpired: isExpired,
      lastTested: integration.lastTestedAt,
    };
  }

  async disconnectIntegration(userId: string): Promise<void> {
    await this.prisma.integration.updateMany({
      where: {
        userId,
        providerName: 'ghl',
        isDeleted: false,
      },
      data: {
        status: 'inactive',
      },
    });

    this.logger.log('GHL integration disconnected', { userId });
  }


  private async saveTokens(userId: string, tokens: GHLTokens): Promise<void> {
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      token_type: tokens.token_type,
      scope: tokens.scope,
      location_id: tokens.locationId,
      company_id: tokens.companyId,
      user_id: tokens.userId,
    };

    const encryptedCredentials = encrypt(credentials);

    const integrationConfig = {
      location_id: tokens.locationId,
      company_id: tokens.companyId,
      scopes: tokens.scope.split(' '),
    };

    // Check if there's an active (not deleted) integration
    const existingActiveIntegration = await this.prisma.integration.findFirst({
      where: {
        userId,
        providerName: 'ghl',
        isDeleted: false,
      },
    });

    let integration;

    if (existingActiveIntegration) {
      // Update existing active integration
      integration = await this.prisma.integration.update({
        where: {
          id: existingActiveIntegration.id,
        },
        data: {
          credentials: { encrypted: encryptedCredentials } as any,
          config: integrationConfig as any,
          status: 'active',
          lastTestedAt: new Date(),
          testResult: { success: true, message: 'OAuth completed successfully' } as any,
          lastError: null,
          isDeleted: false, // Ensure it's not deleted
        },
      });

      this.logger.log('GHL tokens updated in existing integration', {
        integrationId: integration.id,
        userId,
        locationId: tokens.locationId,
      });
    } else {
      // Check if there's a deleted integration (to avoid unique constraint violation)
      const deletedIntegration = await this.prisma.integration.findFirst({
        where: {
          userId,
          providerName: 'ghl',
          isDeleted: true,
        },
      });

      if (deletedIntegration) {
        // Restore and update the deleted integration
        integration = await this.prisma.integration.update({
          where: {
            id: deletedIntegration.id,
          },
          data: {
            credentials: { encrypted: encryptedCredentials } as any,
            config: integrationConfig as any,
            status: 'active',
            lastTestedAt: new Date(),
            testResult: { success: true, message: 'OAuth completed successfully' } as any,
            lastError: null,
            isDeleted: false, // Restore it
          },
        });

        this.logger.log('GHL integration restored from deleted state', {
          integrationId: integration.id,
          userId,
          locationId: tokens.locationId,
        });
      } else {
        // Create new integration
        integration = await this.prisma.integration.create({
          data: {
            userId,
            providerType: 'crm',
            providerName: 'ghl',
            credentials: { encrypted: encryptedCredentials } as any,
            config: integrationConfig as any,
            status: 'active',
            lastTestedAt: new Date(),
            testResult: { success: true, message: 'OAuth completed successfully' } as any,
          },
        });

        // this.logger.log('GHL integration created successfully', {
        //   integrationId: integration.id,
        //   userId,
        //   locationId: tokens.locationId,
        // });
      }
    }

    // this.logger.log('GHL tokens saved to database successfully', {
    //   integrationId: integration.id,
    //   userId,
    //   locationId: tokens.locationId,
    //   companyId: tokens.companyId,
    //   status: integration.status,
    //   isDeleted: integration.isDeleted,
    //   createdAt: integration.createdAt,
    //   updatedAt: integration.updatedAt,
    // });
  }

  private generateState(userId: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        nonce,
      }),
    ).toString('base64url');

    this.stateStore.set(state, {
      userId,
      timestamp: Date.now(),
      nonce,
    });

    return state;
  }

  private validateState(state: string): OAuthState | null {
    try {
      const stateData = this.stateStore.get(state);
      if (!stateData) {
        return null;
      }

      if (Date.now() - stateData.timestamp > this.stateExpiryMs) {
        this.stateStore.delete(state);
        return null;
      }

      this.stateStore.delete(state);
      return stateData;
    } catch {
      return null;
    }
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > this.stateExpiryMs) {
        this.stateStore.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired OAuth states`);
    }
  }


  /**
   * Refresh GHL access token using refresh token
   */
  async refreshAccessToken(userId: string): Promise<void> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        userId,
        providerName: 'ghl',
        status: 'active',
        isDeleted: false,
      },
    });

    if (!integration) {
      throw new AppError('GHL integration not found', 404, 'INTEGRATION_NOT_FOUND');
    }

    const credentials = decrypt((integration.credentials as any).encrypted) as any;

    if (!credentials.refresh_token) {
      throw new AppError('GHL refresh token not found', 500, 'GHL_NO_REFRESH_TOKEN');
    }

    try {
      this.logger.log('Refreshing GHL access token', { userId });

      const response = await axios.post(
        this.ghlConfig.tokenUrl,
        {
          grant_type: 'refresh_token',
          refresh_token: credentials.refresh_token,
          client_id: this.ghlConfig.clientId,
          client_secret: this.ghlConfig.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        },
      );

      const { access_token, refresh_token, expires_in, token_type, scope, locationId, companyId } =
        response.data;

      // Update credentials
      const updatedCredentials = {
        ...credentials,
        access_token,
        refresh_token: refresh_token || credentials.refresh_token, // Use new refresh token if provided
        expires_at: Date.now() + expires_in * 1000,
        token_type,
        scope,
        location_id: locationId || credentials.location_id,
        company_id: companyId || credentials.company_id,
      };

      const encryptedCredentials = encrypt(updatedCredentials);

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          credentials: { encrypted: encryptedCredentials } as any,
          lastTestedAt: new Date(),
          testResult: { success: true, message: 'Token refreshed successfully' } as any,
          lastError: null,
        },
      });

      // this.logger.log('GHL access token refreshed successfully', { userId });
    } catch (error: any) {
      this.logger.error('Failed to refresh GHL access token', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        userId,
      });
      throw new AppError('Failed to refresh access token', 500, 'GHL_TOKEN_REFRESH_FAILED');
    }
  }

  async createGHLClient(userId: string): Promise<{ client: GHLApiClient; locationId: string }> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        userId,
        providerName: 'ghl',
        status: 'active',
        isDeleted: false,
      },
    });

    if (!integration) {
      throw new AppError('GHL integration not found', 404, 'INTEGRATION_NOT_FOUND');
    }

    const credentials = decrypt((integration.credentials as any).encrypted) as any;

    if (!credentials.access_token) {
      throw new AppError('GHL access token not found', 500, 'GHL_NO_TOKEN');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = credentials.expires_at && credentials.expires_at < Date.now() + 5 * 60 * 1000;

    if (isExpired) {
      this.logger.log('GHL access token expired or about to expire, refreshing...', { userId });
      try {
        await this.refreshAccessToken(userId);
        // Reload credentials after refresh
        const updatedIntegration = await this.prisma.integration.findFirst({
          where: { id: integration.id },
        });
        if (updatedIntegration) {
          const updatedCredentials = decrypt((updatedIntegration.credentials as any).encrypted) as any;
          credentials.access_token = updatedCredentials.access_token;
          credentials.location_id = updatedCredentials.location_id;
        }
      } catch (error) {
        this.logger.error('Failed to refresh token, using existing token', { userId });
        // Continue with existing token, will fail if truly expired
      }
    }

    const locationId = (integration.config as any)?.location_id || credentials.location_id;

    if (!locationId) {
      throw new AppError('GHL location ID not configured', 500, 'GHL_NO_LOCATION');
    }

    // Create refresh callback function for automatic token refresh on 401
    const refreshCallback = async (): Promise<string> => {
      await this.refreshAccessToken(userId);
      // Reload credentials after refresh
      const updatedIntegration = await this.prisma.integration.findFirst({
        where: { id: integration.id },
      });
      if (updatedIntegration) {
        const updatedCredentials = decrypt((updatedIntegration.credentials as any).encrypted) as any;
        return updatedCredentials.access_token;
      }
      throw new AppError('Failed to get new token after refresh', 500, 'GHL_REFRESH_FAILED');
    };

    const client = new GHLApiClient(credentials.access_token, locationId, refreshCallback);

    return { client, locationId };
  }

  /**
   * Create a static GHL client using API Key from environment variables
   */
  async createStaticClient(): Promise<{ client: GHLApiClient; locationId: string } | null> {
    const apiKey = this.configService.get<string>('GHL_API_KEY');
    const locationId = this.configService.get<string>('GHL_LOCATION_ID');

    if (!apiKey || !locationId) {
      this.logger.debug('Static GHL API Key or Location ID not configured');
      return null;
    }

    this.logger.log('Creating static GHL client with API Key', { locationId });
    // Personal Access Tokens don't need a refresh callback
    const client = new GHLApiClient(apiKey, locationId);
    return { client, locationId };
  }
}

