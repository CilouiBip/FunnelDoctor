import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../src/integrations/encryption/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'ENCRYPTION_KEY') {
                return 'some_random_strong_key_for_encryption_32chars'; // 32 chars
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt text correctly', () => {
    const sensitive = 'this-is-a-sensitive-token-123!';
    const encrypted = service.encrypt(sensitive);
    
    // Encrypted result should be different from original
    expect(encrypted).not.toEqual(sensitive);
    
    // Encrypted result should contain two separators
    expect(encrypted.split(':').length).toBe(3);
    
    // Decryption should return the original text
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(sensitive);
  });

  it('should throw error when encryption key is invalid', () => {
    jest.spyOn(configService, 'get').mockReturnValueOnce('short_key'); // Invalid length
    
    expect(() => {
      const encryptionService = new EncryptionService(configService);
    }).toThrow('ENCRYPTION_KEY must be 32 characters long');
  });

  it('should throw error when decrypting invalid content', () => {
    expect(() => service.decrypt('invalid-format')).toThrow('Decryption failed');
    expect(() => service.decrypt('aaa:bbb:ccc')).toThrow('Decryption failed');
  });

  it('should produce different ciphertexts for the same input', () => {
    const sensitive = 'secret-data';
    const encrypted1 = service.encrypt(sensitive);
    const encrypted2 = service.encrypt(sensitive);
    
    // Each encryption should produce a different result due to random IV
    expect(encrypted1).not.toEqual(encrypted2);
    
    // But both should decrypt to the same original value
    const decrypted1 = service.decrypt(encrypted1);
    const decrypted2 = service.decrypt(encrypted2);
    expect(decrypted1).toEqual(sensitive);
    expect(decrypted2).toEqual(sensitive);
  });
});
