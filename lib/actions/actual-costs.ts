"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CostCategory, Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

interface ActualCostInput {
  category: CostCategory;
  itemName: string;
  count: number;
  unit: string;
  unitCost: number;
  date: Date;
  vendor?: string;
  notes?: string;
}

export async function createActualCost(
  projectId: string,
  data: ActualCostInput
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify project belongs to user
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

  // Calculate total cost on server side (never trust client)
  const totalCost = Number(data.count) * Number(data.unitCost);

  const actualCost = await db.actualCost.create({
    data: {
      category: data.category,
      itemName: data.itemName,
      count: data.count,
      unit: data.unit,
      unitCost: data.unitCost,
      totalCost: totalCost,
      date: data.date,
      vendor: data.vendor,
      notes: data.notes,
      projectId: projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return actualCost;
}

export async function getActualCostsByProject(projectId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify project belongs to user
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

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
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify project belongs to user
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

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
  data: Partial<ActualCostInput>
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify cost belongs to user's project
  const cost = await db.actualCost.findFirst({
    where: {
      id: costId,
      project: {
        userId: userId,
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
  const newCount = data.count !== undefined ? data.count : Number(cost.count);
  const newUnitCost =
    data.unitCost !== undefined ? data.unitCost : Number(cost.unitCost);

  if (data.count !== undefined || data.unitCost !== undefined) {
    totalCost = new Prisma.Decimal(newCount * newUnitCost);
  }

  const updatedCost = await db.actualCost.update({
    where: { id: costId },
    data: {
      ...data,
      totalCost,
    },
  });

  revalidatePath(`/projects/${cost.projectId}`);
  return updatedCost;
}

export async function deleteActualCost(costId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify cost belongs to user's project
  const cost = await db.actualCost.findFirst({
    where: {
      id: costId,
      project: {
        userId: userId,
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
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify project belongs to user
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    throw new Error("Project not found or unauthorized");
  }

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
