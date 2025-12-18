"use server";

import { requestPasswordReset, resetPassword, validateResetToken } from "@/lib/password-reset";

/**
 * Server action to request password reset
 */
export async function requestPasswordResetAction(email: string) {
  return await requestPasswordReset(email);
}

/**
 * Server action to reset password with token
 */
export async function resetPasswordAction(token: string, newPassword: string) {
  return await resetPassword(token, newPassword);
}

/**
 * Server action to validate reset token
 */
export async function validateResetTokenAction(token: string) {
  return await validateResetToken(token);
}
