import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { runRestore, verifyBackup, archiveSnapshot, uploadOffsite } from '../../../../scripts/db-backup-restore.js';

describe('Disaster Recovery & Database Backup/Restore Safety Engine', () => {
  const testBackupsDir = path.resolve(__dirname, '../../../../backups/test-fixture');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Safety Guards & Production Database Protection', () => {
    it('permanently rejects restore against "bebsayik_dev" with FATAL_SAFETY_VIOLATION', async () => {
      await expect(
        runRestore({
          targetDbName: 'bebsayik_dev',
          confirmRestore: true
        })
      ).rejects.toThrow('FATAL_SAFETY_VIOLATION: Restore to database "bebsayik_dev" is permanently prohibited');
    });

    it('permanently rejects restore against "bebsayik_prod" or any production database name', async () => {
      const forbiddenDbs = ['bebsayik_prod', 'bebsayik_production', 'bebsayik', 'admin', 'config', 'local'];
      for (const targetDb of forbiddenDbs) {
        await expect(
          runRestore({
            targetDbName: targetDb,
            confirmRestore: true
          })
        ).rejects.toThrow('FATAL_SAFETY_VIOLATION');
      }
    });

    it('rejects restore when confirmRestore flag is missing or false', async () => {
      await expect(
        runRestore({
          targetDbName: 'bebsayik_test_disposable',
          confirmRestore: false
        })
      ).rejects.toThrow('RESTORE_BLOCKED: Must provide confirmRestore: true');
    });

    it('rejects restore when target database name is empty or missing', async () => {
      await expect(
        runRestore({
          targetDbName: '',
          confirmRestore: true
        })
      ).rejects.toThrow('targetDbName is required');
    });
  });

  describe('2. Backup Integrity & Tamper Detection', () => {
    const fixtureDir = path.join(testBackupsDir, 'snapshot-fixture');

    it('validates authentic backup manifest and SHA-256 checksums', async () => {
      if (!fs.existsSync(fixtureDir)) {
        fs.mkdirSync(fixtureDir, { recursive: true });
      }

      const sampleData = [{ _id: '670e30000000000000000001', name: 'Main Shop' }];
      const jsonContent = JSON.stringify(sampleData, null, 2);
      const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');

      fs.writeFileSync(path.join(fixtureDir, 'shops.json'), jsonContent, 'utf8');

      const manifest = {
        timestamp: new Date().toISOString(),
        environment: 'test',
        database: 'test_db',
        collections: {
          shops: {
            count: 1,
            sizeBytes: Buffer.byteLength(jsonContent),
            sha256: checksum
          }
        }
      };

      fs.writeFileSync(path.join(fixtureDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

      const isValid = await verifyBackup(fixtureDir);
      expect(isValid).toBe(true);
    });

    it('detects tampered backup files and fails verification', async () => {
      // Modify shops.json to invalidate checksum
      fs.writeFileSync(path.join(fixtureDir, 'shops.json'), JSON.stringify([{ tampered: true }]), 'utf8');

      const isValid = await verifyBackup(fixtureDir);
      expect(isValid).toBe(false);

      // Clean up fixture
      fs.rmSync(testBackupsDir, { recursive: true, force: true });
    });
  });

  describe('3. Off-Site Archiving & Cryptographic Checksums', () => {
    const fixtureDir = path.join(testBackupsDir, 'snapshot-archive-test');

    it('creates .tar.gz archive and .sha256 checksum file for valid snapshot', async () => {
      if (!fs.existsSync(fixtureDir)) {
        fs.mkdirSync(fixtureDir, { recursive: true });
      }
      fs.writeFileSync(path.join(fixtureDir, 'manifest.json'), JSON.stringify({ test: true }), 'utf8');

      const result = await archiveSnapshot(fixtureDir);
      expect(result).toHaveProperty('archivePath');
      expect(result).toHaveProperty('checksumPath');
      expect(result).toHaveProperty('sha256');
      expect(typeof result.sha256).toBe('string');
      expect(result.sha256.length).toBe(64);

      expect(fs.existsSync(result.archivePath)).toBe(true);
      expect(fs.existsSync(result.checksumPath)).toBe(true);

      // Verify written sha256 checksum matches actual file
      const archiveContent = fs.readFileSync(result.archivePath);
      const computedHash = crypto.createHash('sha256').update(archiveContent).digest('hex');
      expect(computedHash).toBe(result.sha256);

      // Clean up
      if (fs.existsSync(result.archivePath)) fs.unlinkSync(result.archivePath);
      if (fs.existsSync(result.checksumPath)) fs.unlinkSync(result.checksumPath);
      fs.rmSync(testBackupsDir, { recursive: true, force: true });
    });

    it('rejects archive when snapshot path does not exist', async () => {
      await expect(archiveSnapshot(path.join(testBackupsDir, 'non-existent'))).rejects.toThrow(
        'Snapshot directory does not exist'
      );
    });
  });

  describe('4. Off-Site Storage Sync Engine', () => {
    it('gracefully handles missing cloud CLI / unconfigured S3 and preserves local archive', async () => {
      const dummyArchive = path.join(testBackupsDir, 'dummy.tar.gz');
      if (!fs.existsSync(testBackupsDir)) {
        fs.mkdirSync(testBackupsDir, { recursive: true });
      }
      fs.writeFileSync(dummyArchive, 'dummy-data', 'utf8');

      const result = await uploadOffsite(dummyArchive, { bucket: 'non-existent-test-bucket-xyz' });
      // In test environment without aws credentials, returns success: false with reason
      expect(result.localArchive).toBe(dummyArchive);
      expect(result.success).toBe(false);

      // Clean up
      fs.rmSync(testBackupsDir, { recursive: true, force: true });
    });

    it('rejects uploadOffsite when archive file does not exist', async () => {
      await expect(uploadOffsite(path.join(testBackupsDir, 'non-existent.tar.gz'))).rejects.toThrow(
        'Archive file does not exist'
      );
    });
  });
});

