import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable or generate a default one
 * WARNING: In production, always use a secure key from environment variables
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars!!';
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  // Use first 32 characters as key
  return crypto.scryptSync(key.substring(0, 32), 'salt', KEY_LENGTH);
}

/**
 * Encrypt data
 */
export function encrypt(data: any): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv, tag, and encrypted data
    const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    
    return result;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data
 */
export function decrypt(encryptedData: string): any {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

