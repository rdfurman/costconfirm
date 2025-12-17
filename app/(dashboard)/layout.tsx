import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">CostConfirm</h1>
            </div>
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
