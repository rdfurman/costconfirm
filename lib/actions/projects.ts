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

export async function getProjects() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return user?.projects || [];
}

export async function getProject(projectId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
    include: {
      actualCosts: {
        orderBy: { date: "desc" },
      },
      projectedCosts: {
        orderBy: { createdAt: "desc" },
      },
      buildPhases: {
        orderBy: { projectedStartDate: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

export async function createProject(data: {
  name: string;
  description?: string;
  address?: string;
  contractor?: string;
  projectedCompletion?: Date;
}) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.create({
    data: {
      ...data,
      userId: userId,
    },
  });

  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    address?: string;
    contractor?: string;
    projectedCompletion?: Date;
    actualCompletion?: Date;
  }
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.updateMany({
    where: {
      id: projectId,
      userId: userId,
    },
    data,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function deleteProject(projectId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db.project.deleteMany({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  revalidatePath("/projects");
}
