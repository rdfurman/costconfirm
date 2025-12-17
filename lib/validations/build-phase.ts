import { z } from "zod";
import { sanitizeText, sanitizeMultilineText } from "@/lib/sanitize";

export const createBuildPhaseSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((val) => sanitizeText(val)),
    description: z
      .string()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeMultilineText(val) : val)),
    projectedStartDate: z.coerce.date().optional(),
    projectedCompletionDate: z.coerce.date().optional(),
    actualStartDate: z.coerce.date().optional(),
    actualCompletionDate: z.coerce.date().optional(),
    delayReason: z
      .string()
      .max(1000)
      .optional()
      .transform((val) => (val ? sanitizeMultilineText(val) : val)),
  })
  .refine(
    (data) => {
      if (data.projectedStartDate && data.projectedCompletionDate) {
        return data.projectedStartDate <= data.projectedCompletionDate;
      }
      return true;
    },
    { message: "Start must be before completion", path: ["projectedCompletionDate"] }
  );

export const updateBuildPhaseSchema = createBuildPhaseSchema.partial();

export type CreateBuildPhaseInput = z.infer<typeof createBuildPhaseSchema>;
export type UpdateBuildPhaseInput = z.infer<typeof updateBuildPhaseSchema>;
