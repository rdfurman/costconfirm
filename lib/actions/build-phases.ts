"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

interface BuildPhaseInput {
  name: string;
  description?: string;
  projectedStartDate?: Date;
  projectedCompletionDate?: Date;
  actualStartDate?: Date;
  actualCompletionDate?: Date;
  delayReason?: string;
}

export async function createBuildPhase(
  projectId: string,
  data: BuildPhaseInput
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

  const buildPhase = await db.buildPhase.create({
    data: {
      name: data.name,
      description: data.description,
      projectedStartDate: data.projectedStartDate,
      projectedCompletionDate: data.projectedCompletionDate,
      actualStartDate: data.actualStartDate,
      actualCompletionDate: data.actualCompletionDate,
      delayReason: data.delayReason,
      projectId: projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return buildPhase;
}

export async function getBuildPhasesByProject(projectId: string) {
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

  const phases = await db.buildPhase.findMany({
    where: { projectId },
    orderBy: { projectedStartDate: "asc" },
  });

  return phases;
}

export async function updateBuildPhase(
  phaseId: string,
  data: Partial<BuildPhaseInput>
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        userId: userId,
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
    data,
  });

  revalidatePath(`/projects/${phase.projectId}`);
  return updatedPhase;
}

export async function deleteBuildPhase(phaseId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        userId: userId,
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
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        userId: userId,
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
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify phase belongs to user's project
  const phase = await db.buildPhase.findFirst({
    where: {
      id: phaseId,
      project: {
        userId: userId,
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
