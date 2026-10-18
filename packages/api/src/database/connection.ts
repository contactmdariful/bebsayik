import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

/**
 * Safely masks database credentials from MongoDB connection URI for logging.
 * Prevents plain-text password exposure in logs and stdout.
 */
export function maskMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/(.*?):(.*?)@/, (_match, user) => `//${user}:*****@`);
  } catch {
    return '[PROTECTED_MONGODB_URI]';
  }
}

/**
 * Ensures username and password in MongoDB URI are properly percent-encoded
 * if they contain reserved URI characters.
 */
export function sanitizeMongoUri(rawUri: string): string {
  try {
    const srvPrefix = rawUri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
    const rest = rawUri.slice(srvPrefix.length);
    const atIndex = rest.indexOf('@');
    if (atIndex === -1) return rawUri;

    const userinfo = rest.substring(0, atIndex);
    const hostAndQuery = rest.substring(atIndex + 1);
    const colonIndex = userinfo.indexOf(':');

    if (colonIndex === -1) {
      const encodedUser = encodeURIComponent(decodeURIComponent(userinfo));
      return `${srvPrefix}${encodedUser}@${hostAndQuery}`;
    }

    const rawUser = userinfo.substring(0, colonIndex);
    const rawPass = userinfo.substring(colonIndex + 1);

    const encodedUser = encodeURIComponent(decodeURIComponent(rawUser));
    const encodedPass = encodeURIComponent(decodeURIComponent(rawPass));

    return `${srvPrefix}${encodedUser}:${encodedPass}@${hostAndQuery}`;
  } catch {
    return rawUri;
  }
}

let isConnected = false;

/**
 * Establishes Mongoose connection with configured pool sizes and database name.
 */
export async function connectDatabase(
  customUri?: string,
  customDbName?: string
): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const rawUri = customUri || ENV.MONGODB_URI;
  const dbName = customDbName || ENV.MONGODB_DB_NAME;
  const connectionUri = sanitizeMongoUri(rawUri);
  const safeLogUri = maskMongoUri(connectionUri);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log(`[Database] MongoDB connection established: ${safeLogUri} (DB: ${dbName})`);
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    const sanitizedErrorMsg = err?.message ? maskMongoUri(err.message) : 'Unknown connection error';
    console.error(`[Database] MongoDB connection error: ${sanitizedErrorMsg}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[Database] MongoDB connection disconnected');
  });

  try {
    const client = await mongoose.connect(connectionUri, {
      dbName,
      maxPoolSize: ENV.MONGODB_MAX_POOL_SIZE,
      minPoolSize: ENV.MONGODB_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority'
    });

    isConnected = true;
    return client;
  } catch (err: unknown) {
    const error = err as Error;
    const sanitizedErrorMsg = error?.message ? maskMongoUri(error.message) : 'Unknown error';
    console.error(`[Database] Failed to connect to MongoDB: ${sanitizedErrorMsg}`);
    throw new Error(`MongoDB connection failed: ${sanitizedErrorMsg}`);
  }
}

/**
 * Disconnects active MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected gracefully');
  }
}

/**
 * Registers process signal listeners for clean database disconnection on exit.
 */
export function setupDatabaseGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`[Database] Received ${signal}. Closing MongoDB connection...`);
    try {
      await disconnectDatabase();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}
