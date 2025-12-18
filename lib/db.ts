import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Initialize Prisma Client with production-ready configuration
 * - Logging for development (queries, errors, warnings)
 * - Connection pooling configured via DATABASE_URL
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Connection pool settings are configured via DATABASE_URL query parameters:
 *
 * Example DATABASE_URL with connection pool settings:
 * postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=30
 *
 * Recommended settings:
 * - connection_limit: 10 (for most apps, adjust based on load)
 * - pool_timeout: 30 (seconds to wait for connection from pool)
 * - connect_timeout: 10 (seconds to wait for initial connection)
 */
