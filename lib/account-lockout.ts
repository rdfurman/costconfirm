/**
 * Account Lockout System
 *
 * Prevents brute force attacks by temporarily locking accounts after repeated failed login attempts.
 *
 * Features:
 * - Locks account after 5 failed attempts
 * - 15-minute lockout duration
 * - Automatic unlock after duration
 * - Tracks attempts per email address
 * - Logs lockout events for security monitoring
 */

import { logSecurityEvent } from "@/lib/security-logger";

const LOCKOUT_THRESHOLD = 5; // Number of failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_WINDOW = 30 * 60 * 1000; // 30 minutes - window for counting attempts

interface LockoutState {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
  lastAttemptAt: number;
}

/**
 * In-memory store for lockout state
 * For production with multiple servers, use Redis
 */
const lockoutStore = new Map<string, LockoutState>();

/**
 * Clean up old entries periodically to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, state] of lockoutStore.entries()) {
    // Remove entries older than 1 hour with no active lockout
    if (!state.lockedUntil && now - state.lastAttemptAt > 60 * 60 * 1000) {
      lockoutStore.delete(email);
    }
    // Remove expired lockouts
    if (state.lockedUntil && state.lockedUntil < now) {
      lockoutStore.delete(email);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

/**
 * Check if account is currently locked
 *
 * @param email - Email address to check
 * @throws Error if account is locked
 */
export async function checkAccountLockout(email: string): Promise<void> {
  const state = lockoutStore.get(email);

  if (!state || !state.lockedUntil) {
    return; // Not locked
  }

  const now = Date.now();

  // Check if lockout has expired
  if (state.lockedUntil <= now) {
    // Lockout expired, remove from store
    lockoutStore.delete(email);
    return;
  }

  // Account is still locked
  const remainingMinutes = Math.ceil((state.lockedUntil - now) / 60000);
  const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000) % 60;

  throw new Error(
    `Account temporarily locked due to multiple failed login attempts. ` +
      `Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} ` +
      `and ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}.`
  );
}

/**
 * Record a failed login attempt
 *
 * @param email - Email address of failed attempt
 * @param ip - IP address (optional, for logging)
 */
export async function recordFailedAttempt(
  email: string,
  ip?: string
): Promise<void> {
  const now = Date.now();
  const state = lockoutStore.get(email) || {
    attempts: 0,
    firstAttemptAt: now,
    lastAttemptAt: now,
  };

  // Reset if outside attempt window
  if (now - state.firstAttemptAt > ATTEMPT_WINDOW) {
    state.attempts = 1;
    state.firstAttemptAt = now;
    state.lastAttemptAt = now;
    delete state.lockedUntil;
  } else {
    state.attempts++;
    state.lastAttemptAt = now;
  }

  // Check if threshold exceeded
  if (state.attempts >= LOCKOUT_THRESHOLD) {
    state.lockedUntil = now + LOCKOUT_DURATION;

    // Log lockout event
    await logSecurityEvent({
      event: "unauthorized_access",
      email,
      ip,
      action: "account_lockout",
      details: {
        reason: "Too many failed login attempts",
        attempts: state.attempts,
        lockoutDuration: `${LOCKOUT_DURATION / 60000} minutes`,
        threshold: LOCKOUT_THRESHOLD,
      },
    });

    console.warn(
      `[SECURITY] Account locked: ${email} (${state.attempts} failed attempts from IP: ${ip || "unknown"})`
    );
  }

  lockoutStore.set(email, state);
}

/**
 * Reset failed attempts after successful login
 *
 * @param email - Email address to reset
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  lockoutStore.delete(email);
}

/**
 * Get lockout state for an email (for debugging/admin purposes)
 *
 * @param email - Email address to check
 * @returns Lockout state or undefined if not found
 */
export function getLockoutState(email: string): LockoutState | undefined {
  return lockoutStore.get(email);
}

/**
 * Manually unlock an account (admin function)
 *
 * @param email - Email address to unlock
 */
export async function unlockAccount(email: string): Promise<void> {
  const state = lockoutStore.get(email);

  if (state?.lockedUntil) {
    await logSecurityEvent({
      event: "admin_action",
      email,
      action: "manual_unlock",
      details: {
        reason: "Admin override",
        previousLockoutUntil: new Date(state.lockedUntil).toISOString(),
      },
    });
  }

  lockoutStore.delete(email);
}

/**
 * Get all currently locked accounts (admin function)
 *
 * @returns Array of locked email addresses with unlock times
 */
export function getLockedAccounts(): Array<{
  email: string;
  lockedUntil: Date;
  attempts: number;
}> {
  const now = Date.now();
  const locked: Array<{
    email: string;
    lockedUntil: Date;
    attempts: number;
  }> = [];

  for (const [email, state] of lockoutStore.entries()) {
    if (state.lockedUntil && state.lockedUntil > now) {
      locked.push({
        email,
        lockedUntil: new Date(state.lockedUntil),
        attempts: state.attempts,
      });
    }
  }

  return locked.sort(
    (a, b) => b.lockedUntil.getTime() - a.lockedUntil.getTime()
  );
}

/**
 * For production: Upgrade to Redis-backed lockout tracking
 *
 * Example using Redis:
 *
 * import { Redis } from "@upstash/redis";
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_URL!,
 *   token: process.env.UPSTASH_REDIS_TOKEN!,
 * });
 *
 * export async function checkAccountLockout(email: string): Promise<void> {
 *   const lockoutKey = `lockout:${email}`;
 *   const lockedUntil = await redis.get<number>(lockoutKey);
 *
 *   if (lockedUntil && lockedUntil > Date.now()) {
 *     const remaining = Math.ceil((lockedUntil - Date.now()) / 60000);
 *     throw new Error(`Account locked. Try again in ${remaining} minutes.`);
 *   }
 * }
 *
 * export async function recordFailedAttempt(email: string): Promise<void> {
 *   const attemptsKey = `attempts:${email}`;
 *   const attempts = await redis.incr(attemptsKey);
 *
 *   if (attempts === 1) {
 *     await redis.expire(attemptsKey, 1800); // 30 minute window
 *   }
 *
 *   if (attempts >= LOCKOUT_THRESHOLD) {
 *     const lockoutKey = `lockout:${email}`;
 *     await redis.set(lockoutKey, Date.now() + LOCKOUT_DURATION);
 *     await redis.expire(lockoutKey, Math.ceil(LOCKOUT_DURATION / 1000));
 *   }
 * }
 */
