import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Extend the PrismaClient type to include the new model explicitly
// This handles cases where the IDE/runtime might have stale type caches
export type ExtendedPrismaClient = PrismaClient & {
  adventureQuote: any;
  siteSetting: any; // Using any as a fail-safe for the delegate
};

export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as ExtendedPrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
