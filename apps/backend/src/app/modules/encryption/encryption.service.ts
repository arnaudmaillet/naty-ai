import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  // La clé doit faire exactement 32 caractères pour AES-256
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.length !== 32) {
      throw new Error('ENCRYPTION_KEY dans le .env doit faire exactement 32 caractères.');
    }
    this.key = Buffer.from(secret, 'utf-8');
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // On retourne l'IV et le texte chiffré ensemble, séparés par un ":"
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors du chiffrement des données.');
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const [ivHex, encryptedText] = encryptedData.split(':');
      if (!ivHex || !encryptedText) throw new Error('Format de données chiffrées invalide.');

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors du déchiffrement des données.');
    }
  }
}