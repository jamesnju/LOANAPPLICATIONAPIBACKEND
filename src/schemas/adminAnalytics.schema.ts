import { z } from "zod";

export const analyticsTimeSeriesQuerySchema = z.object({
  metric: z.enum([
    "disbursements",
    "collections",
    "applications",
    "new-customers",
  ]),
  days: z.coerce.number().int().min(1).max(365).default(30),
});