"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await requestPasswordResetAction(email);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setSubmitted(true);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
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
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-sm text-gray-500 text-center space-y-2">
                <p>
                  Remember your password?{" "}
                  <Link href="/auth/signin" className="text-blue-600 hover:underline">
                    Sign in
                  </Link>
                </p>
                <p>
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-blue-600 hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-green-600 bg-green-50 p-4 rounded">
                <p className="font-medium mb-2">Check your email</p>
                <p>{message?.text}</p>
              </div>

              <div className="text-sm text-gray-500 space-y-2">
                <p>
                  The reset link will expire in 1 hour for security reasons.
                </p>
                <p>
                  Didn&apos;t receive an email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>

              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/signin">Back to Sign In</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
