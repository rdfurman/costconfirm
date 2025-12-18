import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect non-admins to projects page
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/projects");
  }

  return <>{children}</>;
}
