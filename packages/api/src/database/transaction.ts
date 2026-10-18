import mongoose, { ClientSession } from 'mongoose';

export interface TransactionOptions {
  maxRetries?: number;
  session?: ClientSession;
}

/**
 * Executes a callback within a MongoDB multi-document ACID transaction.
 * Automatically manages session lifecycle and retries on write conflict.
 */
export async function withTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  // If an active session is passed from a parent context, continue within it
  if (options.session) {
    return work(options.session);
  }

  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();

    try {
      let result: T;

      await session.withTransaction(async () => {
        result = await work(session);
      });

      // @ts-expect-error - result is assigned inside withTransaction callback
      return result;
    } catch (error: unknown) {
      const err = error as Error & { hasErrorLabel?: (label: string) => boolean };
      
      const isTransient =
        err?.hasErrorLabel?.('TransientTransactionError') ||
        err?.hasErrorLabel?.('UnknownTransactionCommitResult') ||
        err?.message?.includes('WriteConflict');

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Transaction] Transient write conflict encountered (attempt ${attempt}/${maxRetries}). Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new Error(`Transaction failed after ${maxRetries} retry attempts`);
}
