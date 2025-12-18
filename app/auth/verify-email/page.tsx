"use client";

import dynamic from "next/dynamic";

// Import with SSR disabled to prevent useSession() SSR errors
const VerifyEmailContent = dynamic(() => import("./verify-email-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  ),
});

export default function VerifyEmailPage() {
  return <VerifyEmailContent />;
}
