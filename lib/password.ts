import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12; // Industry standard, balances security and performance

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Common passwords list (subset for security)
 * In production, consider using a larger list or external service
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "Password123",
  "Password123!",
  "12345678",
  "123456789",
  "qwerty123",
  "admin123",
  "Admin123!",
  "welcome123",
  "Welcome123!",
  "letmein",
  "iloveyou",
  "monkey123",
  "sunshine",
]);

/**
 * Validate password strength (enhanced for security)
 * Implements NIST password guidelines
 * Returns error message if invalid, null if valid
 */
export function validatePasswordStrength(password: string): string | null {
  // Length requirements
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (password.length > 128) {
    return "Password must not exceed 128 characters";
  }

  // Require lowercase letters
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  // Require uppercase letters
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  // Require numbers
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  // Require special characters
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*, etc.)";
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.has(password)) {
    return "This password is too common. Please choose a stronger password.";
  }

  // Check for common patterns (sequential numbers, repeated characters)
  if (/(.)\1{2,}/.test(password)) {
    return "Password should not contain repeated characters (e.g., 'aaa', '111')";
  }

  if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    return "Password should not contain sequential characters (e.g., 'abc', '123')";
  }

  if (/(012|123|234|345|456|567|678|789|890)/.test(password)) {
    return "Password should not contain sequential numbers (e.g., '123', '456')";
  }

  return null; // Valid
}

/**
 * Calculate password strength score (0-4)
 * Useful for password strength meters
 *
 * @param password - Password to evaluate
 * @returns Score from 0 (very weak) to 4 (very strong)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length bonuses
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Penalties
  if (COMMON_PASSWORDS.has(password)) score -= 2;
  if (/(.)\1{2,}/.test(password)) score -= 1;

  return Math.max(0, Math.min(4, score));
}
