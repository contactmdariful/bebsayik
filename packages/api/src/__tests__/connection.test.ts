import { describe, it, expect } from 'vitest';
import { maskMongoUri, sanitizeMongoUri } from '../database/connection.js';

describe('MongoDB Connection Security & Sanitization', () => {
  it('should securely mask password from connection URI', () => {
    const raw = 'mongodb+srv://growthitcombd_db_user:mySuperSecretPass@bebsayik.6kwvimu.mongodb.net/?appName=Bebsayik';
    const masked = maskMongoUri(raw);
    expect(masked).toBe('mongodb+srv://growthitcombd_db_user:*****@bebsayik.6kwvimu.mongodb.net/?appName=Bebsayik');
    expect(masked).not.toContain('mySuperSecretPass');
  });

  it('should percent-encode reserved characters in credentials', () => {
    const rawWithSpecialChars = 'mongodb+srv://growthitcombd_db_user:pass#word@bebsayik.6kwvimu.mongodb.net/?appName=Bebsayik';
    const sanitized = sanitizeMongoUri(rawWithSpecialChars);
    expect(sanitized).toBe('mongodb+srv://growthitcombd_db_user:pass%23word@bebsayik.6kwvimu.mongodb.net/?appName=Bebsayik');
  });

  it('should handle URIs without password gracefully', () => {
    const uriWithoutPass = 'mongodb://localhost:27017/bebsayik_dev';
    expect(maskMongoUri(uriWithoutPass)).toBe('mongodb://localhost:27017/bebsayik_dev');
  });
});
