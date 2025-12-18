"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function VerifySuccessPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    async function refreshSession() {
      if (status === "loading") {
        return; // Wait for session to load
      }

      if (status === "authenticated") {
        // User is logged in - refresh their session to get updated emailVerified
        await update();
        router.push("/projects?verified=true");
      } else {
        // User is not logged in - redirect to signin
        // After signing in, they'll get a fresh JWT with emailVerified from DB
        router.push("/auth/signin?verified=true");
      }
    }

    refreshSession();
  }, [status, update, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <div className="text-center space-y-4">
          <div className="text-green-600">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
          <p className="text-gray-600">Redirecting you to the app...</p>
        </div>
      </div>
    </div>
  );
}
