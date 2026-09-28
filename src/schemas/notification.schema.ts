import { z } from "zod";

/*
 * Notification ID
 */
export const notificationIdSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

/*
 * Create notification
 *
 * This is mainly used internally by the backend.
 */
export const createNotificationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),

  type: z.enum([
    "APPLICATION_SUBMITTED",
    "APPLICATION_APPROVED",
    "APPLICATION_REJECTED",
    "LOAN_DISBURSED",
    "REPAYMENT_DUE",
    "REPAYMENT_OVERDUE",
    "PAYMENT_RECEIVED",
    "GENERAL",
  ]),

  channel: z.enum([
    "EMAIL",
    "SMS",
    "PUSH",
    "IN_APP",
  ]),

  title: z.string().min(1).max(200),

  message: z.string().min(1).max(2000),

  metadata: z.record(z.string(), z.any()).optional(),
});