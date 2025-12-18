"use server";

/**
 * User Management Actions
 *
 * Handles user account management including:
 * - Account deletion (GDPR Right to be Forgotten)
 * - Data anonymization
 * - Soft delete implementation
 */

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { logSecurityEvent } from "@/lib/security-logger";
import { verifySensitiveOperation } from "@/lib/csrf";
import { signOut } from "@/lib/auth";

/**
 * Soft delete user account and associated data
 * Implements GDPR Article 17 (Right to Erasure)
 *
 * @returns Success status and message
 */
export async function deleteUserAccount() {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // Verify CSRF - prevent cross-site deletion attacks
    await verifySensitiveOperation(userId, "delete_user_account");

    // Perform soft delete in a transaction
    await db.$transaction(async (tx) => {
      // Soft delete all user's projects
      await tx.project.updateMany({
        where: {
          userId,
          deletedAt: null, // Only delete non-deleted projects
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Soft delete user account and anonymize data
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId}@deleted.local`, // Anonymize email
          name: "Deleted User", // Anonymize name
          hashedPassword: null, // Remove password
          image: null, // Remove profile image
          emailVerified: null,
        },
      });

      // Delete sessions (force logout)
      await tx.session.deleteMany({
        where: { userId },
      });

      // Delete accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId },
      });
    });

    // Log deletion event
    await logSecurityEvent({
      event: "data_deletion",
      userId,
      email: user.email || undefined,
      action: "delete_account",
      resource: "user",
      details: {
        deletionType: "soft_delete",
        anonymized: true,
      },
    });

    // Sign out user
    await signOut();

    return {
      success: true,
      message: "Account deleted successfully. All data has been anonymized.",
    };
  } catch (error) {
    console.error("Account deletion error:", error);
    return {
      success: false,
      error: "Failed to delete account. Please contact support.",
    };
  }
}

/**
 * Hard delete user data (admin only, for compliance)
 * Permanently removes all user data from the database
 *
 * WARNING: This action is irreversible!
 *
 * @param userId - User ID to permanently delete
 * @returns Success status
 */
export async function permanentlyDeleteUser(userId: string) {
  try {
    const user = await requireAuth();

    // Only admins can permanently delete users
    if (user.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Verify CSRF - prevent cross-site admin actions
    await verifySensitiveOperation(user.id, `permanent_delete_user:${userId}`);

    // Perform hard delete in a transaction
    await db.$transaction(async (tx) => {
      // Delete all costs associated with user's projects
      await tx.actualCost.deleteMany({
        where: {
          project: { userId },
        },
      });

      await tx.projectedCost.deleteMany({
        where: {
          project: { userId },
        },
      });

      await tx.buildPhase.deleteMany({
        where: {
          project: { userId },
        },
      });

      // Delete all projects
      await tx.project.deleteMany({
        where: { userId },
      });

      // Delete sessions and accounts
      await tx.session.deleteMany({
        where: { userId },
      });

      await tx.account.deleteMany({
        where: { userId },
      });

      // Delete security logs related to user
      await tx.securityLog.deleteMany({
        where: { userId },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // Log admin action
    await logSecurityEvent({
      event: "admin_action",
      userId: user.id,
      action: "permanent_delete_user",
      resource: `user:${userId}`,
      details: {
        deletionType: "hard_delete",
        permanent: true,
      },
    });

    return {
      success: true,
      message: "User permanently deleted from database.",
    };
  } catch (error) {
    console.error("Permanent deletion error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete user permanently",
    };
  }
}

/**
 * Get deleted users (admin only)
 * Lists soft-deleted users for review before permanent deletion
 *
 * @returns List of deleted users
 */
export async function getDeletedUsers() {
  try {
    const user = await requireAuth();

    // Only admins can view deleted users
    if (user.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    const deletedUsers = await db.user.findMany({
      where: {
        deletedAt: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        deletedAt: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    return {
      success: true,
      users: deletedUsers,
    };
  } catch (error) {
    console.error("Get deleted users error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch deleted users",
    };
  }
}

/**
 * Restore soft-deleted user account (admin only)
 * Can be used if deletion was accidental
 *
 * @param userId - User ID to restore
 * @returns Success status
 */
export async function restoreUser(userId: string) {
  try {
    const user = await requireAuth();

    // Only admins can restore users
    if (user.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    await db.$transaction(async (tx) => {
      // Restore user
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: null,
        },
      });

      // Restore user's projects
      await tx.project.updateMany({
        where: { userId },
        data: {
          deletedAt: null,
        },
      });
    });

    // Log admin action
    await logSecurityEvent({
      event: "admin_action",
      userId: user.id,
      action: "restore_user",
      resource: `user:${userId}`,
    });

    return {
      success: true,
      message: "User account restored successfully.",
    };
  } catch (error) {
    console.error("User restoration error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore user",
    };
  }
}
