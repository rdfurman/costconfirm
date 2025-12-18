/**
 * Password Reset System
 *
 * Implements secure password reset functionality.
 *
 * Features:
 * - Generates secure reset tokens
 * - Stores tokens in database with 1-hour expiration
 * - Validates tokens and updates passwords
 * - Prevents user enumeration attacks
 *
 * Security:
 * - Tokens expire after 1 hour
 * - Old tokens are invalidated when new one is requested
 * - Uses bcrypt for password hashing
 * - Rate limiting recommended for reset requests
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-logger";

const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a secure reset token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create password reset token for a user
 *
 * @param email - User's email address
 * @returns Reset token
 */
async function createPasswordResetToken(email: string): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + TOKEN_EXPIRY);

  // Delete any existing reset tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier: `reset:${email}` },
  });

  // Create new token (prefix with 'reset:' to distinguish from email verification)
  await db.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token,
      expires,
    },
  });

  return token;
}

/**
 * Send password reset email
 *
 * TODO: Integrate with email service provider
 *
 * @param email - Recipient email
 * @param token - Reset token
 */
async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  // Log that reset email would be sent
  console.log(`[EMAIL] Password reset email for ${email}`);
  console.log(`[EMAIL] Reset URL: ${resetUrl}`);

  // TODO: Replace with actual email service
  // For development, just log the URL
  if (process.env.NODE_ENV === "development") {
    console.log("\n===========================================");
    console.log("🔐 PASSWORD RESET");
    console.log("===========================================");
    console.log(`To: ${email}`);
    console.log(`Link: ${resetUrl}`);
    console.log(`Expires: 1 hour`);
    console.log("===========================================\n");
  }
}

/**
 * Request password reset
 *
 * @param email - User's email address
 * @returns Success status (always returns success to prevent user enumeration)
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user exists
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });

    // Log the reset request
    await logSecurityEvent({
      event: "password_reset_requested",
      email,
      userId: user?.id,
      details: {
        userExists: !!user,
        timestamp: new Date().toISOString(),
      },
    });

    if (user) {
      // Create reset token
      const token = await createPasswordResetToken(email);

      // Send email
      await sendPasswordResetEmail(email, token);
    }

    // Always return success to prevent user enumeration
    return {
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Password reset request error:", error);
    return {
      success: false,
      message: "Failed to process password reset request. Please try again later.",
    };
  }
}

/**
 * Reset password with token
 *
 * @param token - Reset token from email
 * @param newPassword - New password
 * @returns Success status and message
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate password
    if (newPassword.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long.",
      };
    }

    // Find token
    const resetToken = await db.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() }, // Not expired
        identifier: { startsWith: "reset:" }, // Must be a reset token
      },
    });

    if (!resetToken) {
      return {
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      };
    }

    // Extract email from identifier (remove 'reset:' prefix)
    const email = resetToken.identifier.replace("reset:", "");

    // Find user
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    // Delete reset token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: resetToken.identifier,
          token: resetToken.token,
        },
      },
    });

    // Log password reset
    await logSecurityEvent({
      event: "password_reset_completed",
      userId: user.id,
      email: user.email,
      details: {
        resetAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      message: "Failed to reset password. Please try again.",
    };
  }
}

/**
 * Validate reset token without consuming it
 *
 * @param token - Reset token to validate
 * @returns True if token is valid
 */
export async function validateResetToken(token: string): Promise<boolean> {
  try {
    const resetToken = await db.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
        identifier: { startsWith: "reset:" },
      },
    });

    return !!resetToken;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}
