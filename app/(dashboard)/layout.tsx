import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/projects">
                <h1 className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                  CostConfirm
                </h1>
              </Link>
              <nav className="flex items-center gap-4">
                <Link
                  href="/projects"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Projects
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Users
                  </Link>
                )}
              </nav>
            </div>
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
