"use server";

import { auth } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string;
  role: "CLIENT" | "ADMIN";
};

/**
 * Requires authentication. Throws if user not logged in.
 * Returns authenticated user info.
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized - authentication required");
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role,
  };
}

/**
 * Requires ADMIN role. Throws if not admin.
 * Returns authenticated admin user info.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    throw new Error("Forbidden - admin access required");
  }

  return user;
}

/**
 * Requires CLIENT role. Throws if not client.
 * Returns authenticated client user info.
 */
export async function requireClient(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== "CLIENT") {
    throw new Error("Forbidden - client access required");
  }

  return user;
}

/**
 * Returns current user or null if not authenticated.
 * Does NOT throw on unauthenticated access.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role,
  };
}
