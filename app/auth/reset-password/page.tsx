"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordAction, validateResetTokenAction } from "@/lib/actions/password-reset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setIsValidToken(false);
        setValidating(false);
        setMessage({ type: "error", text: "No reset token provided." });
        return;
      }

      const valid = await validateResetTokenAction(token);
      setIsValidToken(valid);
      setValidating(false);

      if (!valid) {
        setMessage({
          type: "error",
          text: "This reset link is invalid or has expired. Please request a new one.",
        });
      }
    }

    checkToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long." });
      setLoading(false);
      return;
    }

    try {
      const result = await resetPasswordAction(token!, password);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        // Redirect to signin after 2 seconds
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Request New Reset Link</Link>
              </Button>

              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/signin">Back to Sign In</Link>
              </Button>
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
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
              />
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            {message?.type === "success" && (
              <p className="text-sm text-gray-500 text-center">
                Redirecting to sign in...
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
