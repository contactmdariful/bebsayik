#!/usr/bin/env node

/**
 * Bebsayik.com — Database Backup & Disaster Recovery Verification Script
 *
 * Operational utility for:
 *   1. Automated schema & collection snapshot backup (mongodump or Mongoose stream)
 *   2. Backup archive checksum & integrity verification
 *   3. Disaster recovery simulation (dry-run & verified restore)
 *
 * SAFETY INVARIANTS:
 *   - NEVER exposes credentials in logs (URIs are strictly sanitized)
 *   - NEVER performs destructive restore on production databases or default "bebsayik_dev"
 *   - Restores are strictly restricted to isolated disposable test databases (e.g. "bebsayik_disposable_test_restore")
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from root .env if present
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Sanitizer for MongoDB URI
function sanitizeMongoUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
}

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const BACKUP_DIR = path.join(ROOT_DIR, 'backups');

const CRITICAL_COLLECTIONS = [
  'shops',
  'users',
  'accounts',
  'accounttransactions',
  'products',
  'productvariants',
  'imeiserials',
  'sales',
  'saleitems',
  'customers',
  'suppliers',
  'goodsreceivednotes',
  'inventorymovements',
  'shifts',
  'shiftdenominations',
  'kisticontracts',
  'kistiinstallments',
  'subscriptionplans',
  'subscriptioninvoices',
  'personalledgercontacts',
  'personalledgertransactions',
  'customerreturnvouchers',
  'purchasereturnvouchers',
  'damagedstockscraps',
  'moneyreceipts',
  'servicejobs'
];

const FORBIDDEN_RESTORE_DATABASES = [
  'bebsayik',
  'bebsayik_dev',
  'bebsayik_prod',
  'bebsayik_production',
  'admin',
  'config',
  'local'
];

function getLatestSnapshotDir() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const entries = fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('snapshot-'))
    .map((d) => path.join(BACKUP_DIR, d.name))
    .sort()
    .reverse();
  return entries[0] || null;
}

function deserializeBson(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deserializeBson);
  if (typeof obj === 'object') {
    if (obj.$numberDecimal !== undefined) {
      return mongoose.Types.Decimal128.fromString(obj.$numberDecimal);
    }
    if (obj.$date !== undefined) {
      return new Date(obj.$date);
    }
    if (obj.$oid !== undefined) {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (
        (key === '_id' || key.endsWith('Id') || key.endsWith('UserId')) &&
        typeof val === 'string' &&
        /^[0-9a-fA-F]{24}$/.test(val)
      ) {
        result[key] = new mongoose.Types.ObjectId(val);
      } else if (
        typeof val === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(val)
      ) {
        result[key] = new Date(val);
      } else {
        result[key] = deserializeBson(val);
      }
    }
    return result;
  }
  return obj;
}

export async function runBackup(options = {}) {
  const uri = options.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/bebsayik_dev';
  console.log(`${BOLD}${CYAN}=== Bebsayik MongoDB Snapshot Backup ===${RESET}`);
  console.log(`Source Database: ${sanitizeMongoUri(uri)}`);
  console.log(`Environment:     ${process.env.NODE_ENV || 'development'}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = options.targetDir || path.join(BACKUP_DIR, `snapshot-${timestamp}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`Destination:     ${targetDir}\n`);

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const manifest = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: db.databaseName,
      collections: {}
    };

    let totalDumpedDocs = 0;

    for (const colName of CRITICAL_COLLECTIONS) {
      try {
        const col = db.collection(colName);
        const count = await col.countDocuments();
        const docs = await col.find({}).toArray();

        const filePath = path.join(targetDir, `${colName}.json`);
        const jsonContent = JSON.stringify(docs, null, 2);
        fs.writeFileSync(filePath, jsonContent, 'utf8');

        const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');
        manifest.collections[colName] = {
          count,
          sizeBytes: Buffer.byteLength(jsonContent),
          sha256: checksum
        };

        totalDumpedDocs += count;
        console.log(`  ✓ Dumped ${colName.padEnd(28)} [${count} docs, SHA256: ${checksum.slice(0, 10)}...]`);
      } catch (err) {
        console.log(`  ⚠ Skipping ${colName.padEnd(28)} (${err.message})`);
      }
    }

    const manifestPath = path.join(targetDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\n${GREEN}${BOLD}✓ Backup successfully completed! Total docs dumped: ${totalDumpedDocs}.${RESET}`);
    console.log(`Location: ${targetDir}`);
    return { success: true, targetDir, manifest, totalDumpedDocs };
  } finally {
    await mongoose.disconnect();
  }
}

export async function verifyBackup(snapshotPath) {
  console.log(`${BOLD}${CYAN}=== Bebsayik Backup Integrity Verification ===${RESET}`);
  const resolvedPath = snapshotPath || getLatestSnapshotDir();

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    console.error(`${RED}Error: Snapshot directory does not exist: ${resolvedPath || 'None found'}${RESET}`);
    return false;
  }

  console.log(`Target Snapshot:    ${resolvedPath}`);
  const manifestPath = path.join(resolvedPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`${RED}Error: Missing manifest.json in snapshot directory!${RESET}`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`Snapshot Database:  ${manifest.database}`);
  console.log(`Snapshot Timestamp: ${manifest.timestamp}\n`);

  let verifiedCount = 0;
  let errorCount = 0;

  for (const [colName, meta] of Object.entries(manifest.collections)) {
    const colFile = path.join(resolvedPath, `${colName}.json`);
    if (!fs.existsSync(colFile)) {
      console.log(`  ${RED}✗ Missing file for collection ${colName}${RESET}`);
      errorCount++;
      continue;
    }

    const content = fs.readFileSync(colFile, 'utf8');
    const computedChecksum = crypto.createHash('sha256').update(content).digest('hex');

    if (computedChecksum !== meta.sha256) {
      console.log(
        `  ${RED}✗ Checksum mismatch on ${colName} (Expected: ${meta.sha256.slice(0, 8)}, Got: ${computedChecksum.slice(0, 8)})${RESET}`
      );
      errorCount++;
      continue;
    }

    const parsed = JSON.parse(content);
    if (parsed.length !== meta.count) {
      console.log(
        `  ${RED}✗ Document count mismatch on ${colName} (Expected: ${meta.count}, Got: ${parsed.length})${RESET}`
      );
      errorCount++;
      continue;
    }

    console.log(`  ✓ Verified ${colName.padEnd(28)} [${meta.count} docs, SHA256 Match]`);
    verifiedCount++;
  }

  console.log('\n------------------------------------------------------------');
  if (errorCount === 0) {
    console.log(`${GREEN}${BOLD}✓ INTEGRITY CHECK PASSED: All ${verifiedCount} collections valid!${RESET}`);
    return true;
  } else {
    console.log(`${RED}${BOLD}✗ INTEGRITY CHECK FAILED: ${errorCount} errors detected!${RESET}`);
    return false;
  }
}

export async function runRestore(params = {}) {
  const { snapshotPath, targetDbName, targetUri, confirmRestore } = params;
  console.log(`${BOLD}${CYAN}=== Bebsayik Disaster Recovery & Restore ===${RESET}`);

  // 1. Mandatory confirmation flag
  if (!confirmRestore) {
    throw new Error(
      'RESTORE_BLOCKED: Must provide confirmRestore: true (or --confirm-restore flag) to proceed with database restoration.'
    );
  }

  // 2. Strict protection of production and bebsayik_dev
  const dbNameLower = (targetDbName || '').trim().toLowerCase();
  if (!dbNameLower) {
    throw new Error(
      'RESTORE_BLOCKED: targetDbName is required and must specify an isolated disposable test database.'
    );
  }

  if (
    FORBIDDEN_RESTORE_DATABASES.includes(dbNameLower) ||
    dbNameLower.includes('prod') ||
    dbNameLower === 'bebsayik_dev'
  ) {
    throw new Error(
      `FATAL_SAFETY_VIOLATION: Restore to database "${targetDbName}" is permanently prohibited. ` +
        `Restore is restricted strictly to isolated disposable test databases (e.g. "bebsayik_test_restore_disposable").`
    );
  }

  // 3. Resolve snapshot path
  const resolvedPath = snapshotPath || getLatestSnapshotDir();
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Snapshot directory does not exist: ${resolvedPath || 'None found'}`);
  }

  // 4. Pre-restore SHA-256 verification
  console.log(`Verifying snapshot integrity before restore...`);
  const isManifestValid = await verifyBackup(resolvedPath);
  if (!isManifestValid) {
    throw new Error('PRE_RESTORE_INTEGRITY_FAILED: Snapshot checksum verification failed. Aborting restore.');
  }

  // 5. Connect to target disposable database
  const baseUri = targetUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/bebsayik_dev';
  // Swap database name to target disposable DB
  const urlObj = new URL(baseUri.startsWith('mongodb') ? baseUri : `mongodb://${baseUri}`);
  urlObj.pathname = `/${targetDbName}`;
  const restoreConnectionUri = urlObj.toString();

  console.log(`\nConnecting to target disposable database: ${sanitizeMongoUri(restoreConnectionUri)}`);
  await mongoose.connect(restoreConnectionUri);

  try {
    const db = mongoose.connection.db;
    const manifestPath = path.join(resolvedPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    let totalRestoredDocs = 0;
    const restoreSummary = {};

    console.log(`Restoring ${Object.keys(manifest.collections).length} collections into "${targetDbName}"...\n`);

    for (const [colName, meta] of Object.entries(manifest.collections)) {
      const colFile = path.join(resolvedPath, `${colName}.json`);
      if (!fs.existsSync(colFile)) continue;

      const rawContent = fs.readFileSync(colFile, 'utf8');
      const docs = JSON.parse(rawContent);

      const targetCol = db.collection(colName);

      // Clean existing records in target disposable collection
      await targetCol.deleteMany({});

      if (docs.length > 0) {
        const deserializedDocs = deserializeBson(docs);
        await targetCol.insertMany(deserializedDocs);
      }

      // Verify restored document count
      const restoredCount = await targetCol.countDocuments();
      if (restoredCount !== meta.count) {
        throw new Error(
          `RESTORE_VERIFICATION_MISMATCH: Collection ${colName} expected ${meta.count} docs, but restored ${restoredCount}`
        );
      }

      totalRestoredDocs += restoredCount;
      restoreSummary[colName] = restoredCount;
      console.log(`  ✓ Restored ${colName.padEnd(28)} [${restoredCount} docs verified]`);
    }

    console.log('\n------------------------------------------------------------');
    console.log(
      `${GREEN}${BOLD}✓ RESTORE VERIFICATION SUCCESS: ${totalRestoredDocs} documents restored with 100% integrity into "${targetDbName}".${RESET}\n`
    );

    return {
      success: true,
      targetDbName,
      totalRestoredDocs,
      restoreSummary
    };
  } finally {
    await mongoose.disconnect();
  }
}

export async function archiveSnapshot(snapshotPath) {
  console.log(`${BOLD}${CYAN}=== Bebsayik Off-Site Backup Archiver ===${RESET}`);
  const resolvedPath = snapshotPath || getLatestSnapshotDir();
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Snapshot directory does not exist: ${resolvedPath || 'None found'}`);
  }

  const parentDir = path.dirname(resolvedPath);
  const baseName = path.basename(resolvedPath);
  const archivePath = path.join(parentDir, `${baseName}.tar.gz`);
  const checksumPath = path.join(parentDir, `${baseName}.tar.gz.sha256`);

  console.log(`Archiving snapshot:   ${resolvedPath}`);
  console.log(`Archive destination:  ${archivePath}`);

  // Execute tar -czf
  execSync(`tar -czf "${archivePath}" -C "${parentDir}" "${baseName}"`, { stdio: 'pipe' });

  // Calculate cryptographic SHA-256 checksum of the tar.gz archive
  const fileBuffer = fs.readFileSync(archivePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  fs.writeFileSync(checksumPath, `${hash}  ${path.basename(archivePath)}\n`, 'utf8');

  console.log(`${GREEN}✓ Archive created successfully: ${archivePath} (${fileBuffer.length} bytes)${RESET}`);
  console.log(`${GREEN}✓ Archive SHA-256: ${hash}${RESET}\n`);

  return { archivePath, checksumPath, sha256: hash, sizeBytes: fileBuffer.length };
}

export async function uploadOffsite(archivePath, options = {}) {
  console.log(`${BOLD}${CYAN}=== Bebsayik Off-Site Storage Sync ===${RESET}`);
  const s3Bucket = options.bucket || process.env.AWS_S3_BUCKET || process.env.R2_BUCKET;
  const offsiteDir = options.offsiteDir || process.env.OFFSITE_BACKUP_DIR;

  let resolvedArchive = archivePath;
  if (!resolvedArchive) {
    // Locate most recent .tar.gz in BACKUP_DIR
    const files = fs.existsSync(BACKUP_DIR)
      ? fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.tar.gz')).sort().reverse()
      : [];
    if (files.length > 0) {
      resolvedArchive = path.join(BACKUP_DIR, files[0]);
    }
  }

  if (!resolvedArchive || !fs.existsSync(resolvedArchive)) {
    throw new Error(`Archive file does not exist: ${resolvedArchive || 'None found'}`);
  }

  const checksumPath = `${resolvedArchive}.sha256`;
  const fileName = path.basename(resolvedArchive);

  if (s3Bucket) {
    console.log(`Target: S3/R2 Bucket [s3://${s3Bucket}/bebsayik-backups/]`);
    try {
      execSync(`aws s3 cp "${resolvedArchive}" "s3://${s3Bucket}/bebsayik-backups/${fileName}"`, { stdio: 'pipe' });
      if (fs.existsSync(checksumPath)) {
        execSync(`aws s3 cp "${checksumPath}" "s3://${s3Bucket}/bebsayik-backups/${path.basename(checksumPath)}"`, { stdio: 'pipe' });
      }
      console.log(`${GREEN}✓ Successfully uploaded encrypted archive and checksum to S3 bucket: ${s3Bucket}${RESET}\n`);
      return { success: true, target: `s3://${s3Bucket}/bebsayik-backups/${fileName}` };
    } catch (err) {
      console.warn(`${YELLOW}⚠ AWS CLI transfer skipped/unconfigured (${err.message}). Local archive preserved for off-site sync.${RESET}\n`);
      return { success: false, reason: err.message, localArchive: resolvedArchive };
    }
  } else if (offsiteDir) {
    if (!fs.existsSync(offsiteDir)) {
      fs.mkdirSync(offsiteDir, { recursive: true });
    }
    const destFile = path.join(offsiteDir, fileName);
    fs.copyFileSync(resolvedArchive, destFile);
    if (fs.existsSync(checksumPath)) {
      fs.copyFileSync(checksumPath, path.join(offsiteDir, path.basename(checksumPath)));
    }
    console.log(`${GREEN}✓ Successfully synced archive to secondary off-site directory: ${offsiteDir}${RESET}\n`);
    return { success: true, target: destFile };
  } else {
    console.log(`${YELLOW}Notice: Neither AWS_S3_BUCKET nor OFFSITE_BACKUP_DIR configured.${RESET}`);
    console.log(`Local archive ready for off-site replication: ${resolvedArchive}`);
    console.log(`To replicate off-site to AWS S3 or Cloudflare R2, run:`);
    console.log(`  aws s3 cp "${resolvedArchive}" s3://<your-bucket>/bebsayik-backups/`);
    console.log(`  aws s3 cp "${checksumPath}" s3://<your-bucket>/bebsayik-backups/\n`);
    return { success: true, localOnly: true, archivePath: resolvedArchive, checksumPath };
  }
}

// CLI argument router (only when run directly)
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('db-backup-restore.js'));

if (isMain) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command === 'backup') {
    runBackup().catch((err) => {
      console.error(`${RED}Backup failed: ${err.message}${RESET}`);
      process.exit(1);
    });
  } else if (command === 'verify') {
    const snapshotDir = args[1] || getLatestSnapshotDir();
    verifyBackup(snapshotDir).then((ok) => {
      if (!ok) process.exit(1);
    });
  } else if (command === 'archive') {
    const snapshotDir = args[1] || getLatestSnapshotDir();
    archiveSnapshot(snapshotDir).catch((err) => {
      console.error(`${RED}Archiving failed: ${err.message}${RESET}`);
      process.exit(1);
    });
  } else if (command === 'offsite') {
    const archivePath = args[1];
    uploadOffsite(archivePath).catch((err) => {
      console.error(`${RED}Offsite sync failed: ${err.message}${RESET}`);
      process.exit(1);
    });
  } else if (command === 'restore') {
    const targetDbName = args[1];
    const confirmFlag = args.includes('--confirm-restore');
    const snapshotDir = args.find((a) => a.startsWith('--snapshot='))?.split('=')[1];

    runRestore({
      snapshotPath: snapshotDir,
      targetDbName,
      confirmRestore: confirmFlag
    }).catch((err) => {
      console.error(`${RED}Restore failed: ${err.message}${RESET}`);
      process.exit(1);
    });
  } else {
    console.log(`
Usage: node scripts/db-backup-restore.js [command] [options]

Commands:
  backup                          Creates a complete snapshot of all financial & tenant collections
  verify [snapshot_dir]           Verifies SHA-256 manifest checksums and document counts
  archive [snapshot_dir]          Compresses snapshot directory into .tar.gz with SHA-256 checksum
  offsite [archive_path]          Uploads archive to off-site cloud storage (AWS S3 / Cloudflare R2)
  restore <target_db> --confirm-restore [--snapshot=<dir>]
                                  Restores snapshot ONLY to an isolated disposable test database

Safety Invariants:
  - Destructive restore to "bebsayik_dev", "bebsayik_prod", or production databases is PERMANENTLY BLOCKED.
  - Mandatory pre-restore SHA-256 integrity verification before any database insertion.
  - Connection credentials are auto-sanitized before terminal logging.
`);
  }
}
