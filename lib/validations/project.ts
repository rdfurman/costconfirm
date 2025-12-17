import { z } from "zod";
import { sanitizeText, sanitizeMultilineText } from "@/lib/sanitize";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name required")
    .max(200)
    .transform((val) => sanitizeText(val)),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => (val ? sanitizeMultilineText(val) : val)),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),
  contractor: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),
  projectedCompletion: z.coerce.date().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  actualCompletion: z.coerce.date().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
