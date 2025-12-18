"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { resendVerificationEmailAction } from "@/lib/actions/email-verification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailContent() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleResendEmail() {
    if (!session?.user?.email) return;

    setLoading(true);
    setMessage(null);

    try {
      const result = await resendVerificationEmailAction(session.user.email);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/auth/signin" });
  }

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            Please verify your email address to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              We sent a verification email to:
            </p>
            <p className="font-medium text-blue-900 mt-1">
              {session?.user?.email}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Click the verification link in the email to access your account.
            </p>
            <p className="text-sm text-gray-600">
              Don&apos;t see the email? Check your spam folder or request a new one.
            </p>
          </div>

          {message && (
            <div
              className={`text-sm p-3 rounded ${
                message.type === "success"
                  ? "text-green-600 bg-green-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend Verification Email"}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>
              Wrong email address?{" "}
              <button
                onClick={handleSignOut}
                className="text-blue-600 hover:underline"
              >
                Sign out
              </button>{" "}
              and create a new account
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
