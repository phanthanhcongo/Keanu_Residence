import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GeolocationData {
  country: string; // Full country name (e.g., "Vietnam")
  countryCode: string; // ISO 3166-1 alpha-2 code (e.g., "VN")
  city?: string;
  region?: string;
  timezone?: string;
  ip: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  private readonly IP_API_URL = 'http://ip-api.com/json';
  private readonly TIMEOUT = 5000; // 5 seconds timeout

  /**
   * Get country and location data from IP address
   * Uses ip-api.com (free, no API key needed, 45 requests/minute)
   *
   * @param ip - The IP address to lookup
   * @returns GeolocationData or null if lookup fails
   */
  async getCountryFromIp(ip: string): Promise<GeolocationData | null> {
    // Skip private/local IPs
    if (!ip || this.isPrivateIp(ip)) {
      this.logger.debug('Skipping geolocation for private IP', { ip });
      return null;
    }

    try {
      this.logger.debug('Looking up IP geolocation', { ip });

      const response = await axios.get(`${this.IP_API_URL}/${ip}`, {
        params: {
          fields: 'status,message,country,countryCode,region,city,timezone,query',
        },
        timeout: this.TIMEOUT,
      });

      const data = response.data;

      // Check if lookup was successful
      if (data.status !== 'success') {
        this.logger.warn('IP geolocation lookup failed', {
          ip,
          status: data.status,
          message: data.message,
        });
        return null;
      }

      const geolocationData: GeolocationData = {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.region,
        timezone: data.timezone,
        ip: data.query || ip,
      };

      // this.logger.log('IP geolocation lookup successful', {
      //   ip,
      //   country: geolocationData.country,
      //   countryCode: geolocationData.countryCode,
      //   city: geolocationData.city,
      // });

      return geolocationData;
    } catch (error: any) {
      this.logger.error('Failed to lookup IP geolocation', {
        ip,
        error: error.message,
        code: error.code,
      });
      return null;
    }
  }

  /**
   * Check if IP is a private/local IP address
   */
  private isPrivateIp(ip: string): boolean {
    if (!ip) return true;

    // Remove IPv6 prefix
    const cleanIp = ip.replace(/^::ffff:/, '');

    // IPv6 localhost
    if (cleanIp === '::1' || cleanIp === '::') return true;

    // IPv4 localhost
    if (cleanIp === '127.0.0.1' || cleanIp.startsWith('127.')) return true;

    // Private IP ranges
    if (cleanIp.startsWith('10.')) return true;
    if (cleanIp.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;

    // Docker default network
    if (cleanIp.startsWith('172.17.') || cleanIp.startsWith('172.18.') || cleanIp.startsWith('172.19.')) return true;

    return false;
  }

  /**
   * Batch lookup multiple IPs (use with caution - rate limited to 45 req/min)
   */
  async batchGetCountryFromIps(ips: string[]): Promise<Map<string, GeolocationData | null>> {
    const results = new Map<string, GeolocationData | null>();

    // Process sequentially to avoid rate limiting
    for (const ip of ips) {
      const data = await this.getCountryFromIp(ip);
      results.set(ip, data);

      // Add small delay to avoid rate limiting (45 req/min = ~1.3 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return results;
  }
}
