"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  async function handleSignOut() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-gray-500" />
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {user.name || user.email}
          </div>
          {user.role && (
            <div className="text-xs text-gray-500">
              {user.role === "ADMIN" ? "Administrator" : "Client"}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
