import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;
  
  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY must be provided in environment variables');
    }
    
    // Dériver une clé de 32 octets à partir de la clé fournie (quelle que soit sa longueur)
    // Utiliser PBKDF2 avec un sel statique pour garantir la constance de la dérivation
    const salt = 'FunnelDoctor_static_salt';
    this.encryptionKey = crypto.pbkdf2Sync(key, salt, 1000, 32, 'sha256');
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param text Text to encrypt
   * @returns Encrypted data with IV and auth tag included
   */
  encrypt(text: string): string {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return the IV, encrypted data, and auth tag as a combined string
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }

  /**
   * Decrypts data that was encrypted with the encrypt method
   * @param encryptedData Combined string of IV, encrypted data, and auth tag
   * @returns Decrypted text
   */
  decrypt(encryptedData: string): string {
    try {
      // Split the parts
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}
