/**
 * Email Verification Endpoint
 *
 * Handles email verification when user clicks link from their email.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/lib/email-verification";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=InvalidToken", request.url)
    );
  }

  const result = await verifyEmail(token);

  if (result.success) {
    // Redirect to signin with success message
    return NextResponse.redirect(
      new URL("/auth/signin?verified=true", request.url)
    );
  } else {
    // Redirect to signin with error
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(result.message)}`,
        request.url
      )
    );
  }
}
