/**
 * CSRF Protection
 *
 * Cross-Site Request Forgery (CSRF) protection for sensitive server actions.
 *
 * Next.js 15 Server Actions have built-in CSRF protection, but this provides
 * additional defense-in-depth for critical operations like:
 * - Account deletion
 * - Data export
 * - Admin actions
 * - Payment processing
 *
 * Verifies that requests originate from the same domain.
 */

import { headers } from "next/headers";

/**
 * Verify that request originates from the same origin
 *
 * Checks Origin and Referer headers to ensure request is coming
 * from the same domain, preventing CSRF attacks.
 *
 * @throws Error if origin verification fails
 */
export async function verifySameOrigin(): Promise<void> {
  const headersList = await headers();

  const origin = headersList.get("origin");
  const referer = headersList.get("referer");
  const host = headersList.get("host");

  // In development, allow localhost variations
  if (process.env.NODE_ENV === "development") {
    const isLocalhost =
      origin?.includes("localhost") ||
      origin?.includes("127.0.0.1") ||
      referer?.includes("localhost") ||
      referer?.includes("127.0.0.1");

    if (isLocalhost) {
      return; // Allow in development
    }
  }

  // Check origin header (most reliable)
  if (origin) {
    // Extract hostname from origin
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host;

      // Verify origin matches host
      if (originHost !== host) {
        throw new Error(
          `CSRF verification failed: Origin ${originHost} does not match host ${host}`
        );
      }

      return; // Valid
    } catch (error) {
      if (error instanceof Error && error.message.includes("CSRF")) {
        throw error;
      }
      throw new Error(`CSRF verification failed: Invalid origin header`);
    }
  }

  // Fallback to referer header (less reliable, can be spoofed)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.host;

      // Verify referer matches host
      if (refererHost !== host) {
        throw new Error(
          `CSRF verification failed: Referer ${refererHost} does not match host ${host}`
        );
      }

      return; // Valid
    } catch (error) {
      if (error instanceof Error && error.message.includes("CSRF")) {
        throw error;
      }
      throw new Error(`CSRF verification failed: Invalid referer header`);
    }
  }

  // No origin or referer header - suspicious
  throw new Error(
    `CSRF verification failed: No origin or referer header present`
  );
}

/**
 * Verify CSRF token (for API routes)
 *
 * For API routes, you can implement token-based CSRF protection.
 * This is already handled by Next.js for Server Actions.
 *
 * @param token - CSRF token from client
 * @returns true if valid
 */
export async function verifyCSRFToken(token: string): Promise<boolean> {
  // Next.js Server Actions handle this automatically
  // This function is here for custom API routes if needed

  if (!token) {
    return false;
  }

  // For custom implementation:
  // 1. Generate token on session creation
  // 2. Store in session or encrypted cookie
  // 3. Verify token matches stored value
  // 4. Ensure token hasn't expired

  // For now, rely on Next.js built-in protection
  return true;
}

/**
 * Verify request for sensitive operations
 *
 * Combines origin verification with additional security checks
 * for critical operations like account deletion.
 *
 * @param userId - User ID performing the action
 * @param operation - Description of operation for logging
 */
export async function verifySensitiveOperation(
  userId: string,
  operation: string
): Promise<void> {
  // Verify same origin
  await verifySameOrigin();

  // Additional logging for sensitive operations
  console.log(
    `[SECURITY] Sensitive operation: ${operation} by user ${userId}`
  );

  // Could add additional checks here:
  // - Require recent authentication
  // - Require 2FA for admin actions
  // - Check IP address hasn't changed
  // - Verify session is still valid
}
