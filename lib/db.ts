import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Initialize Prisma Client with production-ready configuration
 * - Logging for development (queries, errors, warnings)
 * - Connection pooling configured via DATABASE_URL
 * - Query timeout middleware to prevent hanging queries
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Query timeout middleware - prevents queries from hanging indefinitely
const QUERY_TIMEOUT_MS = 10000; // 10 seconds

db.$use(async (params, next) => {
  const start = Date.now();

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const duration = Date.now() - start;
      reject(
        new Error(
          `Query timeout after ${duration}ms: ${params.model}.${params.action}`
        )
      );
    }, QUERY_TIMEOUT_MS);
  });

  try {
    // Race between query and timeout
    const result = await Promise.race([next(params), timeoutPromise]);

    // Log slow queries in development
    if (process.env.NODE_ENV === "development") {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(
          `[SLOW QUERY] ${params.model}.${params.action} took ${duration}ms`
        );
      }
    }

    return result;
  } catch (error) {
    // Log timeout errors
    if (error instanceof Error && error.message.includes("Query timeout")) {
      console.error("[DB ERROR]", error.message);
    }
    throw error;
  }
});

// Ensure connection is established
db.$connect().catch((err) => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});

// Graceful shutdown
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await db.$disconnect();
  });
}

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
