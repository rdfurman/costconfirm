"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CostCategory, Prisma } from "@/app/generated/prisma/client";
import { requireAuth } from "@/lib/auth-utils";
import {
  createProjectedCostSchema,
  updateProjectedCostSchema,
  type CreateProjectedCostInput,
  type UpdateProjectedCostInput,
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

export async function createProjectedCost(
  projectId: string,
  data: CreateProjectedCostInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = createProjectedCostSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  // Calculate total cost on server side (never trust client)
  const totalCost = new Prisma.Decimal(Number(validation.data.count) * Number(validation.data.unitCost));

  const projectedCost = await db.projectedCost.create({
    data: {
      ...validation.data,
      totalCost,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return projectedCost;
}

export async function getProjectedCostsByProject(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const costs = await db.projectedCost.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return costs;
}

export async function getProjectedCostsByCategory(
  projectId: string,
  category: CostCategory
) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const costs = await db.projectedCost.findMany({
    where: {
      projectId,
      category,
    },
    orderBy: { createdAt: "desc" },
  });

  return costs;
}

export async function updateProjectedCost(
  costId: string,
  data: UpdateProjectedCostInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = updateProjectedCostSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify cost belongs to user's project
  const cost = await db.projectedCost.findFirst({
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

  const updatedCost = await db.projectedCost.update({
    where: { id: costId },
    data: {
      ...validation.data,
      totalCost,
    },
  });

  revalidatePath(`/projects/${cost.projectId}`);
  return updatedCost;
}

export async function deleteProjectedCost(costId: string) {
  const user = await requireAuth();

  // Verify cost belongs to user's project
  const cost = await db.projectedCost.findFirst({
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

  await db.projectedCost.delete({
    where: { id: costId },
  });

  revalidatePath(`/projects/${cost.projectId}`);
}

export async function getProjectedCostSummary(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  // Get all costs for the project
  const costs = await db.projectedCost.findMany({
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

export async function getCostVariance(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  // Get both projected and actual costs
  const projectedCosts = await db.projectedCost.findMany({
    where: { projectId },
  });

  const actualCosts = await db.actualCost.findMany({
    where: { projectId },
  });

  // Calculate totals by category
  const variance = {
    overall: {
      projected: 0,
      actual: 0,
      variance: 0,
      percentVariance: 0,
    },
    byCategory: {
      MATERIALS: { projected: 0, actual: 0, variance: 0, percentVariance: 0 },
      LABOR: { projected: 0, actual: 0, variance: 0, percentVariance: 0 },
      MISCELLANEOUS: {
        projected: 0,
        actual: 0,
        variance: 0,
        percentVariance: 0,
      },
    },
  };

  // Sum projected costs
  projectedCosts.forEach((cost) => {
    const amount = Number(cost.totalCost);
    variance.overall.projected += amount;
    variance.byCategory[cost.category].projected += amount;
  });

  // Sum actual costs
  actualCosts.forEach((cost) => {
    const amount = Number(cost.totalCost);
    variance.overall.actual += amount;
    variance.byCategory[cost.category].actual += amount;
  });

  // Calculate variances
  variance.overall.variance =
    variance.overall.actual - variance.overall.projected;
  variance.overall.percentVariance =
    variance.overall.projected > 0
      ? (variance.overall.variance / variance.overall.projected) * 100
      : 0;

  // Calculate category variances
  Object.keys(variance.byCategory).forEach((category) => {
    const cat = category as CostCategory;
    variance.byCategory[cat].variance =
      variance.byCategory[cat].actual - variance.byCategory[cat].projected;
    variance.byCategory[cat].percentVariance =
      variance.byCategory[cat].projected > 0
        ? (variance.byCategory[cat].variance /
            variance.byCategory[cat].projected) *
          100
        : 0;
  });

  return variance;
}
