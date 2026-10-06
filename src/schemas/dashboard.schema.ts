// backend/src/schemas/dashboard.schema.ts
import { z } from "zod";

/**
 * Optional query parameters — mostly unused for the customer dashboard,
 * but kept here so we can extend later (e.g. include past loans).
 */
export const customerDashboardQuerySchema = z.object({
  includeRepaid: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "true" || v === true),
});

export type CustomerDashboardQuery = z.infer<
  typeof customerDashboardQuerySchema
>;