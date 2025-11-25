import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// TODO: Replace with Auth.js session check
async function isAuthenticated() {
  // This will be replaced with Auth.js auth() helper
  return false;
}

export default async function Home() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    redirect("/projects");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">CostConfirm</h1>
        <p className="text-xl text-gray-600 mb-8">
          Track and analyze home builder billing against industry standards
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/api/auth/signin">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
