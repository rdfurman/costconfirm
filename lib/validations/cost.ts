import { z } from "zod";
import { sanitizeText, sanitizeMultilineText } from "@/lib/sanitize";

const costCategorySchema = z.enum(["MATERIALS", "LABOR", "MISCELLANEOUS"]);

const financialNumberSchema = z
  .number()
  .positive("Must be positive")
  .max(99999999.99, "Value too large")
  .refine((val) => Number.isInteger(val * 100), "Max 2 decimal places");

const quantitySchema = z
  .number()
  .positive("Must be positive")
  .max(9999999.999)
  .refine((val) => Number.isInteger(val * 1000), "Max 3 decimal places");

export const createActualCostSchema = z.object({
  category: costCategorySchema,
  itemName: z
    .string()
    .min(1)
    .max(200)
    .transform((val) => sanitizeText(val)),
  count: quantitySchema,
  unit: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s/]+$/)
    .transform((val) => sanitizeText(val)),
  unitCost: financialNumberSchema,
  date: z.coerce.date(),
  vendor: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => (val ? sanitizeMultilineText(val) : val)),
});

export const createProjectedCostSchema = createActualCostSchema.omit({
  date: true,
  vendor: true,
});

export const updateActualCostSchema = createActualCostSchema.partial();
export const updateProjectedCostSchema = createProjectedCostSchema.partial();

export type CreateActualCostInput = z.infer<typeof createActualCostSchema>;
export type CreateProjectedCostInput = z.infer<typeof createProjectedCostSchema>;
export type UpdateActualCostInput = z.infer<typeof updateActualCostSchema>;
export type UpdateProjectedCostInput = z.infer<typeof updateProjectedCostSchema>;
