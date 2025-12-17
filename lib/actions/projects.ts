"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireClient } from "@/lib/auth-utils";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/validations/project";

export async function getProjects() {
  const user = await requireAuth();

  // CLIENT: only their non-deleted projects
  if (user.role === "CLIENT") {
    const userProjects = await db.user.findUnique({
      where: {
        id: user.id,
        deletedAt: null, // Exclude soft-deleted users
      },
      include: {
        projects: {
          where: { deletedAt: null }, // Exclude soft-deleted projects
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    return userProjects?.projects || [];
  }

  // ADMIN: all non-deleted projects
  return await db.project.findMany({
    where: { deletedAt: null }, // Exclude soft-deleted projects
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getProject(projectId: string) {
  const user = await requireAuth();

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null, // Exclude soft-deleted projects
      ...(user.role === "CLIENT" ? { userId: user.id } : {}),
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

export async function createProject(data: CreateProjectInput) {
  const user = await requireClient(); // Only clients can create projects

  // Validate input
  const validation = createProjectSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  const project = await db.project.create({
    data: {
      ...validation.data,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectInput
) {
  const user = await requireAuth();

  // Validate input
  const validation = updateProjectSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  if (user.role === "CLIENT") {
    // CLIENT: must own the project
    const result = await db.project.updateMany({
      where: {
        id: projectId,
        userId: user.id, // Ownership check
      },
      data: validation.data,
    });

    if (result.count === 0) {
      throw new Error("Project not found or unauthorized");
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return result;
  } else {
    // ADMIN: can update any project
    const result = await db.project.update({
      where: { id: projectId },
      data: validation.data,
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return result;
  }
}

export async function deleteProject(projectId: string) {
  const user = await requireAuth();

  if (user.role === "CLIENT") {
    // CLIENT: must own the project
    const result = await db.project.deleteMany({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      throw new Error("Project not found or unauthorized");
    }
  } else {
    // ADMIN: can delete any project
    await db.project.delete({
      where: { id: projectId },
    });
  }

  revalidatePath("/projects");
}
