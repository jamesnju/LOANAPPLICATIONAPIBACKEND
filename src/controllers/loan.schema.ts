import { z } from "zod";

/*
 * ============================================================
 * LOAN ID
 * ============================================================
 */

export const loanIdSchema = z.object({
  id: z.string().uuid("Invalid loan ID"),
});

/*
 * ============================================================
 * APPLICATION ID
 * ============================================================
 */

export const applicationIdSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
});

/*
 * ============================================================
 * DISBURSE LOAN
 * ============================================================
 *
 * At this stage we are not integrating directly with M-Pesa.
 *
 * The finance/admin user records how the approved loan
 * was disbursed.
 */

export const disburseLoanSchema = z.object({
  paymentMethod: z.enum([
    "MPESA",
    "BANK_TRANSFER",
    "CASH",
    "CARD",
    "MOBILE_MONEY",
    "OTHER",
  ]),

  transactionReference: z
    .string()
    .trim()
    .max(100, "Transaction reference cannot exceed 100 characters")
    .optional(),

  comments: z
    .string()
    .trim()
    .max(2000, "Comments cannot exceed 2000 characters")
    .optional(),
});