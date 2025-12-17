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
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-logger";

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
        identifier: verificationToken.identifier,
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
 * TODO: Integrate with email service provider
 *
 * Options:
 * - Resend (https://resend.com) - Modern, developer-friendly
 * - SendGrid (https://sendgrid.com) - Established, reliable
 * - AWS SES - Cost-effective for scale
 * - Postmark - Transactional email specialist
 *
 * @param email - Recipient email
 * @param token - Verification token
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;

  // Log that verification email would be sent
  console.log(`[EMAIL] Verification email for ${email}`);
  console.log(`[EMAIL] Verification URL: ${verificationUrl}`);

  // TODO: Replace with actual email service
  // Example with Resend:
  /*
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'CostConfirm <noreply@costconfirm.com>',
    to: email,
    subject: 'Verify your email address',
    html: `
      <h1>Welcome to CostConfirm!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
  });
  */

  // For development, just log the URL
  if (process.env.NODE_ENV === "development") {
    console.log("\n===========================================");
    console.log("📧 EMAIL VERIFICATION");
    console.log("===========================================");
    console.log(`To: ${email}`);
    console.log(`Link: ${verificationUrl}`);
    console.log("===========================================\n");
  }
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
