import { Request } from 'express';

/**
 * Extract real client IP address from request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
 * Works with Vercel, Cloudflare, nginx, Docker, and other proxies
 */
export function getClientIp(req: Request): string | undefined {
  // 1. Cloudflare header (most reliable if using Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // 2. X-Real-IP header (common in nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // 3. X-Forwarded-For header (most common proxy header)
  // Format: "client, proxy1, proxy2" - take the first one (real client)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const forwarded = typeof xForwardedFor === 'string' ? xForwardedFor : xForwardedFor[0];
    const ips = forwarded.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // 4. Vercel specific headers
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'];
  if (vercelForwardedFor && typeof vercelForwardedFor === 'string') {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // 5. Express req.ip (works when trust proxy is enabled)
  if (req.ip) {
    // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
    const ip = req.ip.replace(/^::ffff:/, '');
    // Skip if it's a Docker internal IP
    if (!ip.startsWith('172.') && !ip.startsWith('::')) {
      return ip;
    }
  }

  // 6. Socket remote address (fallback)
  const socketIp = req.socket?.remoteAddress;
  if (socketIp) {
    const ip = socketIp.replace(/^::ffff:/, '');
    if (!ip.startsWith('172.') && !ip.startsWith('::')) {
      return ip;
    }
  }

  return undefined;
}

/**
 * Check if IP is a private/local IP address
 */
export function isPrivateIp(ip: string): boolean {
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
