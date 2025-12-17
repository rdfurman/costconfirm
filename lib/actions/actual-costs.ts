"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CostCategory, Prisma } from "@/app/generated/prisma/client";
import { requireAuth } from "@/lib/auth-utils";
import {
  createActualCostSchema,
  updateActualCostSchema,
  type CreateActualCostInput,
  type UpdateActualCostInput,
} from "@/lib/validations/cost";

async function verifyProjectAccess(projectId: string, userId: string, userRole: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ...(userRole === "CLIENT" ? { userId } : {}),
    },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

  return project;
}

export async function createActualCost(
  projectId: string,
  data: CreateActualCostInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = createActualCostSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  // Calculate total cost on server side (never trust client)
  const totalCost = Number(validation.data.count) * Number(validation.data.unitCost);

  const actualCost = await db.actualCost.create({
    data: {
      ...validation.data,
      totalCost,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return actualCost;
}

export async function getActualCostsByProject(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const costs = await db.actualCost.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
  });

  return costs;
}

export async function getActualCostsByCategory(
  projectId: string,
  category: CostCategory
) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const costs = await db.actualCost.findMany({
    where: {
      projectId,
      category,
    },
    orderBy: { date: "desc" },
  });

  return costs;
}

export async function updateActualCost(
  costId: string,
  data: UpdateActualCostInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = updateActualCostSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify cost belongs to user's project
  const cost = await db.actualCost.findFirst({
    where: {
      id: costId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!cost) {
    throw new Error("Cost not found or unauthorized");
  }

  // If count or unitCost are being updated, recalculate total
  let totalCost = cost.totalCost;
  const newCount = validation.data.count !== undefined ? validation.data.count : Number(cost.count);
  const newUnitCost = validation.data.unitCost !== undefined ? validation.data.unitCost : Number(cost.unitCost);

  if (validation.data.count !== undefined || validation.data.unitCost !== undefined) {
    totalCost = new Prisma.Decimal(newCount * newUnitCost);
  }

  const updatedCost = await db.actualCost.update({
    where: { id: costId },
    data: {
      ...validation.data,
      totalCost,
    },
  });

  revalidatePath(`/projects/${cost.projectId}`);
  return updatedCost;
}

export async function deleteActualCost(costId: string) {
  const user = await requireAuth();

  // Verify cost belongs to user's project
  const cost = await db.actualCost.findFirst({
    where: {
      id: costId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!cost) {
    throw new Error("Cost not found or unauthorized");
  }

  await db.actualCost.delete({
    where: { id: costId },
  });

  revalidatePath(`/projects/${cost.projectId}`);
}

export async function getActualCostSummary(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  // Get all costs for the project
  const costs = await db.actualCost.findMany({
    where: { projectId },
  });

  // Calculate totals by category
  const summary = {
    total: 0,
    byCategory: {
      MATERIALS: 0,
      LABOR: 0,
      MISCELLANEOUS: 0,
    },
    count: costs.length,
  };

  costs.forEach((cost) => {
    const amount = Number(cost.totalCost);
    summary.total += amount;
    summary.byCategory[cost.category] += amount;
  });

  return summary;
}
