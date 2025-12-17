/**
 * Rate Limiting
 *
 * Prevents brute force attacks and API abuse by limiting request frequency.
 *
 * Development: Uses in-memory storage (resets on server restart)
 * Production: Upgrade to Redis using @upstash/ratelimit for distributed rate limiting
 */

interface RateLimitState {
  requests: number[]
}

/**
 * In-memory rate limiter for development
 * For production, replace with Redis-backed rate limiter
 */
class InMemoryRateLimiter {
  private store: Map<string, RateLimitState> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up old entries every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if request is allowed under rate limit
   * @param identifier - Unique identifier (email, IP, userId)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns success: boolean, remaining: number of requests left
   */
  async limit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now()
    const state = this.store.get(identifier) || { requests: [] }

    // Filter out requests outside the current window
    const recentRequests = state.requests.filter(
      (timestamp) => now - timestamp < windowMs
    )

    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      const oldestRequest = Math.min(...recentRequests)
      const resetTime = oldestRequest + windowMs

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      }
    }

    // Add current request
    recentRequests.push(now)
    this.store.set(identifier, { requests: recentRequests })

    return {
      success: true,
      remaining: limit - recentRequests.length,
      reset: now + windowMs,
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * Useful after successful authentication
   */
  async reset(identifier: string): Promise<void> {
    this.store.delete(identifier)
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour

    for (const [identifier, state] of this.store.entries()) {
      const hasRecentRequests = state.requests.some(
        (timestamp) => now - timestamp < maxAge
      )

      if (!hasRecentRequests) {
        this.store.delete(identifier)
      }
    }
  }

  /**
   * Get current state for debugging
   */
  getState(identifier: string): RateLimitState | undefined {
    return this.store.get(identifier)
  }
}

// Create singleton instance
const rateLimiter = new InMemoryRateLimiter()

/**
 * Rate limit authentication attempts
 * 5 attempts per minute per email
 */
export async function checkAuthRateLimit(email: string): Promise<void> {
  const result = await rateLimiter.limit(
    `auth:${email}`,
    5, // 5 attempts
    60 * 1000 // per minute
  )

  if (!result.success) {
    const remainingSeconds = Math.ceil((result.reset - Date.now()) / 1000)
    throw new Error(
      `Too many authentication attempts. Please try again in ${remainingSeconds} seconds.`
    )
  }
}

/**
 * Rate limit registration attempts
 * 3 registrations per hour per IP
 */
export async function checkRegistrationRateLimit(
  identifier: string
): Promise<void> {
  const result = await rateLimiter.limit(
    `registration:${identifier}`,
    3, // 3 registrations
    60 * 60 * 1000 // per hour
  )

  if (!result.success) {
    const remainingMinutes = Math.ceil((result.reset - Date.now()) / 60000)
    throw new Error(
      `Too many registration attempts. Please try again in ${remainingMinutes} minutes.`
    )
  }
}

/**
 * Rate limit API requests
 * 100 requests per minute per user
 */
export async function checkApiRateLimit(userId: string): Promise<void> {
  const result = await rateLimiter.limit(
    `api:${userId}`,
    100, // 100 requests
    60 * 1000 // per minute
  )

  if (!result.success) {
    const remainingSeconds = Math.ceil((result.reset - Date.now()) / 1000)
    throw new Error(
      `API rate limit exceeded. Please try again in ${remainingSeconds} seconds.`
    )
  }
}

/**
 * Reset rate limit after successful authentication
 */
export async function resetAuthRateLimit(email: string): Promise<void> {
  await rateLimiter.reset(`auth:${email}`)
}

/**
 * Get IP address from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')

  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a generic identifier if no IP found
  return 'unknown'
}

/**
 * For production: Upgrade to Redis-backed rate limiting
 *
 * Install: npm install @upstash/ratelimit @upstash/redis
 *
 * import { Ratelimit } from "@upstash/ratelimit"
 * import { Redis } from "@upstash/redis"
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_URL!,
 *   token: process.env.UPSTASH_REDIS_TOKEN!,
 * })
 *
 * export const authLimiter = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(5, "1 m"),
 *   analytics: true,
 * })
 *
 * export async function checkAuthRateLimit(email: string): Promise<void> {
 *   const { success, reset } = await authLimiter.limit(`auth:${email}`)
 *
 *   if (!success) {
 *     const remainingSeconds = Math.ceil((reset - Date.now()) / 1000)
 *     throw new Error(`Too many attempts. Try again in ${remainingSeconds}s.`)
 *   }
 * }
 */
