import { z } from "zod";

export const stkSearchQuerySchema = z.object({
  query: z.string().trim().optional(),
  status: z
    .enum(["PENDING", "SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"])
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const manualResolveSchema = z.object({
  receipt: z.string().trim().min(4).max(50),
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(3).max(500),
});

export const markFailedSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});