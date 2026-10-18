import { connectDatabase, disconnectDatabase, maskMongoUri } from './connection.js';
import { ENV } from '../config/env.js';

/**
 * Diagnostic tool to verify MongoDB Atlas / Replica Set connectivity.
 * Safe for terminal execution: Never prints unmasked credentials.
 */
export async function checkMongoConnection(): Promise<void> {
  const uri = ENV.MONGODB_URI;
  const dbName = ENV.MONGODB_DB_NAME;
  const safeUri = maskMongoUri(uri);

  console.log(`[Diagnostic] Target MongoDB Host: ${safeUri}`);
  console.log(`[Diagnostic] Target Database Name: ${dbName}`);

  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    console.error('[Diagnostic] Connection Aborted: URI contains placeholder <db_password>. Real password must be configured in local untracked .env.');
    process.exit(1);
  }

  try {
    console.log('[Diagnostic] Connecting to MongoDB...');
    const mongooseInstance = await connectDatabase(uri, dbName);
    
    // Ping database
    const db = mongooseInstance.connection.db;
    if (db) {
      const pingResult = await db.admin().ping();
      console.log('[Diagnostic] Ping successful:', JSON.stringify(pingResult));
    }

    console.log('[Diagnostic] MongoDB Atlas connectivity verified successfully.');
    await disconnectDatabase();
    process.exit(0);
  } catch (err: unknown) {
    const error = err as Error;
    const sanitizedMsg = maskMongoUri(error.message || 'Unknown error');
    console.error(`[Diagnostic] Connection test failed: ${sanitizedMsg}`);
    
    if (sanitizedMsg.includes('AuthenticationFailed') || sanitizedMsg.includes('bad auth')) {
      console.error('[Diagnostic] Diagnostic Reason: Authentication failed. Please verify Atlas username and password.');
    } else if (sanitizedMsg.includes('ServerSelectionTimeout') || sanitizedMsg.includes('ETIMEDOUT') || sanitizedMsg.includes('ENOTFOUND')) {
      console.error('[Diagnostic] Diagnostic Reason: Network or timeout error. Please check Atlas Network Access IP Whitelist (allow current IP or 0.0.0.0/0).');
    }
    
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].includes('check_connection')) {
  checkMongoConnection();
}
