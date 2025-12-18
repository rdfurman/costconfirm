"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

/**
 * Get all users (admin only)
 * Returns all non-deleted users with project counts
 */
export async function getAllUsers() {
  const user = await requireAuth();

  // Only admins can view all users
  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const users = await db.user.findMany({
    where: {
      deletedAt: null, // Exclude soft-deleted users
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projects: {
            where: {
              deletedAt: null, // Only count active projects
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users;
}

/**
 * Get user statistics (admin only)
 * Returns summary stats about users in the system
 */
export async function getUserStats() {
  const user = await requireAuth();

  // Only admins can view user stats
  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const [totalUsers, clientUsers, adminUsers, verifiedUsers] = await Promise.all([
    db.user.count({
      where: { deletedAt: null },
    }),
    db.user.count({
      where: { role: "CLIENT", deletedAt: null },
    }),
    db.user.count({
      where: { role: "ADMIN", deletedAt: null },
    }),
    db.user.count({
      where: { emailVerified: { not: null }, deletedAt: null },
    }),
  ]);

  return {
    totalUsers,
    clientUsers,
    adminUsers,
    verifiedUsers,
  };
}
