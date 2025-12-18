/**
 * Email Verification System
 *
 * Implements email verification for new user registrations.
 *
 * Features:
 * - Generates secure verification tokens
 * - Stores tokens in database with expiration
 * - Verifies email ownership
 * - Prevents unverified users from sensitive actions
 *
 * TODO: Integrate with email service (Resend, SendGrid, etc.)
 */

import crypto from "crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-logger";

// Lazy-load Resend to avoid build-time initialization
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is not set. " +
      "Please add it to your .env file or environment configuration."
    );
  }

  return new Resend(apiKey);
}

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure verification token
 *
 * @returns Random hex token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create email verification token for a user
 *
 * @param email - User's email address
 * @returns Verification token
 */
export async function createVerificationToken(
  email: string
): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + TOKEN_EXPIRY);

  // Delete any existing tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Create new token
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

/**
 * Verify email with token
 *
 * @param token - Verification token from email link
 * @returns Success status and message
 */
export async function verifyEmail(
  token: string
): Promise<{ success: boolean; message: string; email?: string }> {
  try {
    // Find token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() }, // Not expired
      },
    });

    if (!verificationToken) {
      return {
        success: false,
        message: "Invalid or expired verification link. Please request a new one.",
      };
    }

    const email = verificationToken.identifier;

    // Mark email as verified
    const user = await db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Delete verification token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    // Log verification event
    await logSecurityEvent({
      event: "data_access",
      userId: user.id,
      email: user.email,
      action: "email_verified",
      details: {
        verifiedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: "Email verified successfully! You can now sign in.",
      email,
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return {
      success: false,
      message: "Failed to verify email. Please try again.",
    };
  }
}

/**
 * Check if user's email is verified
 *
 * @param userId - User ID to check
 * @returns true if verified, false otherwise
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return !!user?.emailVerified;
}

/**
 * Send verification email
 *
 * @param email - Recipient email
 * @param token - Verification token
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;

  // In development, also log to console for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("\n===========================================");
    console.log("📧 EMAIL VERIFICATION");
    console.log("===========================================");
    console.log(`To: ${email}`);
    console.log(`Link: ${verificationUrl}`);
    console.log("===========================================\n");
  }

  // Send email via Resend
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "CostConfirm <onboarding@resend.dev>",
    to: email,
    subject: "Verify your CostConfirm email address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
            <h1 style="color: #111827; margin-top: 0;">Welcome to CostConfirm!</h1>
            <p style="font-size: 16px; color: #4b5563;">
              Thanks for signing up! Please verify your email address to get started.
            </p>
            <p style="font-size: 16px; color: #4b5563;">
              Click the button below to verify your email:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              This link will expire in <strong>24 hours</strong>.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't create a CostConfirm account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Resend verification email
 *
 * @param email - User's email address
 * @returns Success status
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: "Email is already verified.",
      };
    }

    // Create new token
    const token = await createVerificationToken(email);

    // Send email
    await sendVerificationEmail(email, token);

    return {
      success: true,
      message: "Verification email sent! Please check your inbox.",
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return {
      success: false,
      message: "Failed to send verification email. Please try again later.",
    };
  }
}

/**
 * Require verified email (use in server actions)
 *
 * @param userId - User ID to check
 * @throws Error if email not verified
 */
export async function requireVerifiedEmail(userId: string): Promise<void> {
  const verified = await isEmailVerified(userId);

  if (!verified) {
    throw new Error(
      "Please verify your email address before performing this action. Check your inbox for the verification link."
    );
  }
}
