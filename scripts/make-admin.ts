#!/usr/bin/env tsx
/**
 * Script to securely promote a user to ADMIN role
 *
 * Usage:
 *   npm run make-admin <email>
 *
 * Example:
 *   npm run make-admin user@example.com
 *
 * Security:
 * - Only runs locally with database access
 * - Requires email to be passed as command-line argument
 * - Verifies user exists before updating
 * - Logs all admin promotions for audit trail
 */

import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get email from command line arguments
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Error: Email address required");
    console.log("\nUsage: npm run make-admin <email>");
    console.log("Example: npm run make-admin user@example.com\n");
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`❌ Error: Invalid email format: ${email}\n`);
    process.exit(1);
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Error: User not found: ${email}\n`);
      process.exit(1);
    }

    if (user.deletedAt) {
      console.error(`❌ Error: User account is deleted: ${email}\n`);
      process.exit(1);
    }

    // Check if already admin
    if (user.role === "ADMIN") {
      console.log(`ℹ️  User ${email} is already an ADMIN\n`);
      process.exit(0);
    }

    // Promote to admin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    // Log the promotion for audit trail
    await prisma.securityLog.create({
      data: {
        event: "admin_promotion",
        userId: updatedUser.id,
        email: updatedUser.email,
        details: {
          previousRole: user.role,
          newRole: "ADMIN",
          promotedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Successfully promoted ${email} to ADMIN role`);
    console.log(`   User ID: ${updatedUser.id}`);
    console.log(`   Name: ${updatedUser.name || "(not set)"}\n`);
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
