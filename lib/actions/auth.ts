"use server";

import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { checkRegistrationRateLimit, getClientIP } from "@/lib/rate-limit";
import { logSecurityEvent, logRateLimit } from "@/lib/security-logger";
import {
  createVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";
import { headers } from "next/headers";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
}) {
  // Validate input
  const validation = registerSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  // Check rate limit - prevent spam registrations
  const headersList = await headers();
  const clientIP = getClientIP(headersList);
  try {
    await checkRegistrationRateLimit(clientIP);
  } catch (error) {
    // Log rate limit hit
    await logRateLimit("registration", data.email, clientIP);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Too many registration attempts"
    };
  }

  // Check password strength
  const passwordError = validatePasswordStrength(data.password);
  if (passwordError) {
    await logSecurityEvent({
      event: "registration_failure",
      email: data.email,
      ip: clientIP,
      details: { reason: "Weak password" },
    });
    return { success: false, error: passwordError };
  }

  // Check if user exists
  const existingUser = await db.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    await logSecurityEvent({
      event: "registration_failure",
      email: data.email,
      ip: clientIP,
      details: { reason: "Email already exists" },
    });
    return { success: false, error: "Email already registered" };
  }

  // Hash password and create user
  try {
    const hashedPassword = await hashPassword(data.password);
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name || data.email,
        hashedPassword,
        role: "CLIENT",
      },
    });

    // Create and send verification email
    const verificationToken = await createVerificationToken(user.email);
    await sendVerificationEmail(user.email, verificationToken);

    // Log successful registration
    await logSecurityEvent({
      event: "registration_success",
      userId: user.id,
      email: user.email,
      ip: clientIP,
      details: {
        emailVerificationSent: true,
      },
    });

    return {
      success: true,
      userId: user.id,
      message: "Account created! Please check your email to verify your address.",
    };
  } catch (error) {
    console.error("Registration error:", error);
    await logSecurityEvent({
      event: "registration_failure",
      email: data.email,
      ip: clientIP,
      details: { reason: "Database error", error: String(error) },
    });
    return { success: false, error: "Failed to create account" };
  }
}
