"use server";

import { resendVerificationEmail } from "@/lib/email-verification";

/**
 * Server action to resend verification email
 */
export async function resendVerificationEmailAction(email: string) {
  return await resendVerificationEmail(email);
}
