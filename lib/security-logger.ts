/**
 * Security Event Logging
 *
 * Logs security-relevant events for audit trails, compliance, and incident investigation.
 *
 * Features:
 * - Structured event logging with consistent format
 * - Database persistence for audit trails
 * - Console logging for development
 * - Ready for integration with external logging services (Datadog, Sentry, etc.)
 */

import { db } from "@/lib/db";

/**
 * Security event types
 */
export type SecurityEvent =
  | "auth_success"
  | "auth_failure"
  | "auth_rate_limit"
  | "registration_success"
  | "registration_failure"
  | "registration_rate_limit"
  | "password_reset_requested"
  | "password_reset_completed"
  | "unauthorized_access"
  | "data_access"
  | "data_modification"
  | "data_deletion"
  | "admin_action"
  | "session_expired"
  | "idor_attempt"
  | "validation_failure";

/**
 * Security log entry structure
 */
export interface SecurityLogEntry {
  event: SecurityEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, any>;
}

/**
 * Log a security event
 *
 * @param entry - Security event details
 * @returns Promise that resolves when event is logged
 */
export async function logSecurityEvent(
  entry: SecurityLogEntry
): Promise<void> {
  const timestamp = new Date();

  // Create log entry with timestamp
  const logEntry = {
    ...entry,
    timestamp,
  };

  // Console logging for development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[SECURITY] ${timestamp.toISOString()} - ${entry.event}`,
      {
        userId: entry.userId,
        email: entry.email,
        resource: entry.resource,
        action: entry.action,
        ip: entry.ip,
        details: entry.details,
      }
    );
  }

  // Store in database for audit trail
  try {
    await db.securityLog.create({
      data: {
        event: entry.event,
        userId: entry.userId,
        email: entry.email,
        ip: entry.ip,
        userAgent: entry.userAgent,
        resource: entry.resource,
        action: entry.action,
        details: entry.details,
      },
    });
  } catch (error) {
    // Log to console if database write fails
    // Don't throw error to prevent breaking application flow
    console.error("[SECURITY] Failed to write security log:", error);
  }

  // TODO: For production, also send to external logging service
  // Example with Datadog:
  // await datadogLogger.info('security_event', logEntry)
  //
  // Example with Sentry:
  // Sentry.captureMessage(`Security: ${entry.event}`, {
  //   level: 'info',
  //   extra: logEntry,
  // })
}

/**
 * Helper: Log successful authentication
 */
export async function logAuthSuccess(
  userId: string,
  email: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    event: "auth_success",
    userId,
    email,
    ip,
    userAgent,
  });
}

/**
 * Helper: Log failed authentication attempt
 */
export async function logAuthFailure(
  email: string,
  reason: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    event: "auth_failure",
    email,
    ip,
    userAgent,
    details: { reason },
  });
}

/**
 * Helper: Log rate limit hit
 */
export async function logRateLimit(
  type: "auth" | "registration" | "api",
  identifier: string,
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event: type === "auth"
      ? "auth_rate_limit"
      : type === "registration"
      ? "registration_rate_limit"
      : "auth_rate_limit",
    email: identifier,
    ip,
    details: { type },
  });
}

/**
 * Helper: Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  userId: string,
  resource: string,
  action: string,
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event: "unauthorized_access",
    userId,
    resource,
    action,
    ip,
  });
}

/**
 * Helper: Log IDOR (Insecure Direct Object Reference) attempt
 */
export async function logIdorAttempt(
  userId: string,
  attemptedResource: string,
  resourceOwnerId: string,
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event: "idor_attempt",
    userId,
    resource: attemptedResource,
    ip,
    details: {
      attemptedOwnerId: resourceOwnerId,
      reason: "User attempted to access another user's resource",
    },
  });
}

/**
 * Helper: Log data modification
 */
export async function logDataModification(
  userId: string,
  resource: string,
  action: "create" | "update" | "delete",
  resourceId?: string
): Promise<void> {
  await logSecurityEvent({
    event: "data_modification",
    userId,
    resource,
    action,
    details: { resourceId },
  });
}

/**
 * Helper: Log admin action
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resource?: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    event: "admin_action",
    userId,
    action,
    resource,
    details,
  });
}

/**
 * Get recent security events
 * Useful for security dashboard or investigation
 */
export async function getRecentSecurityEvents(
  limit: number = 100,
  filters?: {
    event?: SecurityEvent;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: any = {};

  if (filters?.event) {
    where.event = filters.event;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  return await db.securityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get security event statistics
 * Useful for monitoring and alerting
 */
export async function getSecurityStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  failedAuthAttempts: number;
  rateLimitHits: number;
  unauthorizedAttempts: number;
  idorAttempts: number;
}> {
  const events = await db.securityLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const eventsByType: Record<string, number> = {};
  let failedAuthAttempts = 0;
  let rateLimitHits = 0;
  let unauthorizedAttempts = 0;
  let idorAttempts = 0;

  for (const event of events) {
    eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;

    if (event.event === "auth_failure") failedAuthAttempts++;
    if (event.event.includes("rate_limit")) rateLimitHits++;
    if (event.event === "unauthorized_access") unauthorizedAttempts++;
    if (event.event === "idor_attempt") idorAttempts++;
  }

  return {
    totalEvents: events.length,
    eventsByType,
    failedAuthAttempts,
    rateLimitHits,
    unauthorizedAttempts,
    idorAttempts,
  };
}
