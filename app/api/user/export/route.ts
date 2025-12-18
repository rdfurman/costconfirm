/**
 * GDPR Data Export Endpoint
 *
 * Allows users to export all their personal data
 * Required for GDPR Article 20 (Right to Data Portability)
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security-logger";

export async function GET() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Fetch all user data
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        projects: {
          where: { deletedAt: null },
          include: {
            actualCosts: true,
            projectedCosts: true,
            buildPhases: true,
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Log data export event
    await logSecurityEvent({
      event: "data_access",
      userId: user.id,
      email: user.email || undefined,
      action: "export",
      resource: "user_data",
      details: {
        projectCount: userData.projects.length,
        exportedAt: new Date().toISOString(),
      },
    });

    // Return data as JSON download
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        user: userData,
        metadata: {
          exportVersion: "1.0",
          format: "JSON",
          dataRetentionPolicy: "30 days after account deletion",
        },
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="costconfirm-data-export-${userData.id}-${Date.now()}.json"`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
