import axios, { AxiosInstance } from 'axios';
import { Logger } from '@nestjs/common';

export class GHLApiClient {
  private readonly logger = new Logger(GHLApiClient.name);
  private readonly client: AxiosInstance;
  private readonly locationId: string;
  private accessToken: string;
  private refreshTokenCallback?: () => Promise<string>;

  constructor(accessToken: string, locationId: string, refreshTokenCallback?: () => Promise<string>) {
    this.locationId = locationId;
    this.accessToken = accessToken;
    this.refreshTokenCallback = refreshTokenCallback;
    this.client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Version: '2021-07-28',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`GHL API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          data: config.data,
          headers: {
            Authorization: config.headers?.Authorization ? 'Bearer ***' : undefined,
            'Content-Type': config.headers?.['Content-Type'],
            Version: config.headers?.Version,
          },
        });
        return config;
      },
      (error) => {
        this.logger.error('GHL API Request Error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and we have refresh callback, try to refresh token
        if (error.response?.status === 401 && this.refreshTokenCallback && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            this.logger.log('GHL token expired, attempting to refresh...');
            const newToken = await this.refreshTokenCallback();
            this.accessToken = newToken;

            // Update authorization header
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            this.client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            // Retry the original request
            return this.client(originalRequest);
          } catch (refreshError) {
            this.logger.error('Failed to refresh GHL token', refreshError);
            return Promise.reject(refreshError);
          }
        }

        this.logger.error('GHL API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );
  }


  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<any> {
    const response = await this.client.get(`/contacts/${contactId}`);
    return response.data.contact || response.data;
  }

  /**
   * Get contacts list
   */
  async getContacts(params?: any): Promise<any> {
    const response = await this.client.get('/contacts', { params });
    return response.data;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<void> {
    await this.client.delete(`/contacts/${contactId}`);
  }

  /**
   * Upsert contact (create or update)
   * GHL API endpoint: POST /contacts/upsert
   */
  async upsertContact(contactData: any): Promise<any> {
    const response = await this.client.post('/contacts/upsert', contactData);
    return response.data.contact || response.data;
  }

  /**
   * Add tags to contact
   * GHL API endpoint: POST /contacts/{contactId}/tags
   */
  async addTags(contactId: string, tags: string[]): Promise<any> {
    this.logger.log('Adding tags to GHL contact - START', {
      contactId,
      tags,
      tagsCount: tags.length,
      url: `/contacts/${contactId}/tags`,
      baseURL: this.client.defaults.baseURL,
    });

    // Validate inputs
    if (!contactId) {
      this.logger.error('ContactId is empty, cannot add tags');
      throw new Error('ContactId is required');
    }

    if (!tags || tags.length === 0) {
      this.logger.warn('Tags array is empty, nothing to add');
      return { success: true, message: 'No tags to add' };
    }

    try {
      const requestBody = { tags };
      this.logger.debug('GHL addTags request body', { body: requestBody });

      const response = await this.client.post(`/contacts/${contactId}/tags`, requestBody);

      // this.logger.log('Successfully added tags to GHL contact - SUCCESS', {
      //   contactId,
      //   tags,
      //   responseStatus: response.status,
      //   responseData: response.data,
      // });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to add tags to GHL contact - ERROR', {
        contactId,
        tags,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        },
      });
      throw error;
    }
  }

  /**
   * Send message via GHL Conversations API
   * GHL API endpoint: POST /conversations/messages
   * Requires Version: 2021-04-15
   */
  async sendMessage(messageData: {
    contactId: string;
    type: 'SMS' | 'Email' | 'WhatsApp' | 'IG' | 'FB' | 'Custom' | 'Live_Chat';
    status: 'delivered' | 'failed' | 'pending' | 'read';
    subject?: string;
    html?: string;
    message?: string;
    emailFrom?: string;
    emailTo?: string;
    emailCc?: string[];
    emailBcc?: string[];
    [key: string]: any;
  }): Promise<any> {
    this.logger.log('Sending message via GHL Conversations API - START', {
      contactId: messageData.contactId,
      type: messageData.type,
      status: messageData.status,
    });

    // Validate required fields
    if (!messageData.contactId) {
      this.logger.error('ContactId is required for sending message');
      throw new Error('ContactId is required');
    }

    if (!messageData.type) {
      this.logger.error('Message type is required');
      throw new Error('Message type is required');
    }

    if (!messageData.status) {
      this.logger.error('Message status is required');
      throw new Error('Message status is required');
    }

    try {
      // Create a temporary client with the correct Version header for Conversations API
      const conversationsClient = axios.create({
        baseURL: this.client.defaults.baseURL,
        headers: {
          ...this.client.defaults.headers,
          Version: '2021-04-15', // Required version for Conversations API
        },
        timeout: this.client.defaults.timeout,
      });

      // Add request interceptor to use the same auth token
      conversationsClient.interceptors.request.use((config) => {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        return config;
      });

      // Add response interceptor for token refresh
      conversationsClient.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;

          // If 401 and we have refresh callback, try to refresh token
          if (error.response?.status === 401 && this.refreshTokenCallback && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
              this.logger.log('GHL token expired, attempting to refresh...');
              const newToken = await this.refreshTokenCallback();
              this.accessToken = newToken;

              // Update authorization header
              originalRequest.headers.Authorization = `Bearer ${newToken}`;

              // Retry the original request
              return conversationsClient(originalRequest);
            } catch (refreshError) {
              this.logger.error('Failed to refresh GHL token', refreshError);
              return Promise.reject(refreshError);
            }
          }

          return Promise.reject(error);
        },
      );

      this.logger.debug('GHL sendMessage request body', { body: messageData });

      const response = await conversationsClient.post('/conversations/messages', messageData);

      // this.logger.log('Successfully sent message via GHL Conversations API - SUCCESS', {
      //   contactId: messageData.contactId,
      //   type: messageData.type,
      //   responseStatus: response.status,
      //   messageId: response.data?.messageId,
      //   conversationId: response.data?.conversationId,
      // });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to send message via GHL Conversations API - ERROR', {
        contactId: messageData.contactId,
        type: messageData.type,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  }

}

