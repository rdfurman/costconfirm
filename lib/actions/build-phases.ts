"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import {
  createBuildPhaseSchema,
  updateBuildPhaseSchema,
  type CreateBuildPhaseInput,
  type UpdateBuildPhaseInput,
} from "@/lib/validations/build-phase";

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

export async function createBuildPhase(
  projectId: string,
  data: CreateBuildPhaseInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = createBuildPhaseSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const buildPhase = await db.buildPhase.create({
    data: {
      ...validation.data,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return buildPhase;
}

export async function getBuildPhasesByProject(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  await verifyProjectAccess(projectId, user.id, user.role);

  const phases = await db.buildPhase.findMany({
    where: { projectId },
    orderBy: { projectedStartDate: "asc" },
  });

  return phases;
}

export async function updateBuildPhase(
  phaseId: string,
  data: UpdateBuildPhaseInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = updateBuildPhaseSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!phase) {
    throw new Error("Build phase not found or unauthorized");
  }

  const updatedPhase = await db.buildPhase.update({
    where: { id: phaseId },
    data: validation.data,
  });

  revalidatePath(`/projects/${phase.projectId}`);
  return updatedPhase;
}

export async function deleteBuildPhase(phaseId: string) {
  const user = await requireAuth();

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!phase) {
    throw new Error("Build phase not found or unauthorized");
  }

  await db.buildPhase.delete({
    where: { id: phaseId },
  });

  revalidatePath(`/projects/${phase.projectId}`);
}

export async function getProjectTimeline(projectId: string) {
  const user = await requireAuth();

  // Verify project access
  const project = await verifyProjectAccess(projectId, user.id, user.role);

  const phases = await db.buildPhase.findMany({
    where: { projectId },
    orderBy: { projectedStartDate: "asc" },
  });

  // Calculate timeline summary
  const summary = {
    totalPhases: phases.length,
    completedPhases: phases.filter((p) => p.actualCompletionDate).length,
    inProgressPhases: phases.filter(
      (p) => p.actualStartDate && !p.actualCompletionDate
    ).length,
    delayedPhases: phases.filter((p) => p.delayReason).length,
    projectStart: phases[0]?.projectedStartDate || null,
    projectEnd:
      phases[phases.length - 1]?.projectedCompletionDate ||
      project.projectedCompletion ||
      null,
    actualStart: phases[0]?.actualStartDate || null,
    actualEnd:
      phases[phases.length - 1]?.actualCompletionDate ||
      project.actualCompletion ||
      null,
  };

  return {
    summary,
    phases,
  };
}

export async function markPhaseStarted(phaseId: string, startDate?: Date) {
  const user = await requireAuth();

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!phase) {
    throw new Error("Build phase not found or unauthorized");
  }

  const updatedPhase = await db.buildPhase.update({
    where: { id: phaseId },
    data: {
      actualStartDate: startDate || new Date(),
    },
  });

  revalidatePath(`/projects/${phase.projectId}`);
  return updatedPhase;
}

export async function markPhaseCompleted(
  phaseId: string,
  completionDate?: Date
) {
  const user = await requireAuth();

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        ...(user.role === "CLIENT" ? { userId: user.id } : {}),
      },
    },
    include: {
      project: true,
    },
  });

  if (!phase) {
    throw new Error("Build phase not found or unauthorized");
  }

  const updatedPhase = await db.buildPhase.update({
    where: { id: phaseId },
    data: {
      actualCompletionDate: completionDate || new Date(),
    },
  });

  revalidatePath(`/projects/${phase.projectId}`);
  return updatedPhase;
}
