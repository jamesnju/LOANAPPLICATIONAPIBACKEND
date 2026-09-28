import { z } from "zod";
/*
 * ============================================================
 * PAYMENT SCHEMAS
 * ============================================================
 */
/*
 * Payment ID
 *
 * Used when retrieving a specific payment.
 */
export const paymentIdSchema = z.object({
    id: z.string().uuid("Invalid payment ID"),
});
/*
 * Loan ID
 */
export const paymentLoanIdSchema = z.object({
    loanId: z.string().uuid("Invalid loan ID"),
});
/*
 * Create payment
 *
 * This records a completed repayment.
 *
 * Example:
 *
 * {
 *   "amount": 1000,
 *   "paymentMethod": "MPESA",
 *   "transactionReference": "QWE123ABC"
 * }
 */
export const createPaymentSchema = z.object({
    amount: z
        .number()
        .positive("Payment amount must be greater than zero"),
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
        .max(100)
        .optional(),
    scheduleId: z
        .string()
        .uuid("Invalid repayment schedule ID")
        .optional(),
    metadata: z
        .record(z.string(), z.any())
        .optional(),
});
//# sourceMappingURL=payment.schema.js.map