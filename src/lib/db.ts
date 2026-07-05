import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { registerEncryptionMiddleware } from "./encryption-middleware";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({ 
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, // 15s to allow for Render Database cold starts
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  const client = new PrismaClient({ adapter });
  registerEncryptionMiddleware(client);
  return client;
}

// Extend the PrismaClient type to include the new model explicitly
// This handles cases where the IDE/runtime might have stale type caches
export type ExtendedPrismaClient = PrismaClient & {
  adventureQuote: unknown;
  siteSetting: unknown; // Using unknown as a fail-safe for the delegate
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache Prisma globally across all environments (including production build)
// to prevent connection pool leaks and memory exhaustion during parallel page pre-rendering.
globalForPrisma.prisma = prisma;

/**
 * Executes a database action with automatic retry on serialization failures (Prisma error P2034).
 * This is crucial when using Serializable isolation level on concurrent transactions.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 50
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const isSerializationError =
        error.code === "P2034" ||
        error.message?.includes("P2034") ||
        error.meta?.code === "P2034" ||
        error.message?.includes("could not serialize access");

      if (isSerializationError && attempt < maxRetries) {
        console.warn(
          `[TransactionRetry] Serialization failure encountered (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}

