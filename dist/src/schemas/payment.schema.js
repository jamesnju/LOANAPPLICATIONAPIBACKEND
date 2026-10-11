import { z } from "zod";
/* ============================================================
 * INITIATE STK PUSH
 * ============================================================
 * Called by the customer from the loan detail page.
 */
export const initiateStkPushSchema = z.object({
    loanId: z.string().uuid("Invalid loan ID"),
    amount: z
        .coerce
        .number()
        .positive("Amount must be greater than zero")
        .max(1_000_000, "Amount is too large"),
    phone: z
        .string()
        .trim()
        .min(9)
        .max(15),
});
/* ============================================================
 * MANUAL PAYMENT
 * ============================================================
 * Finance/admin recording a payment made out-of-band
 * (bank transfer, cash, cheque).
 */
export const manualPaymentSchema = z.object({
    loanId: z.string().uuid("Invalid loan ID"),
    amount: z.coerce.number().positive(),
    paymentMethod: z.enum(["BANK_TRANSFER", "CASH", "CHEQUE", "OTHER"]),
    transactionReference: z.string().trim().max(100).optional(),
    comments: z.string().trim().max(2000).optional(),
});
/* ============================================================
 * LIST PAYMENTS
 * ============================================================ */
export const listPaymentsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z
        .enum(["PENDING", "COMPLETED", "FAILED", "REVERSED", "CANCELLED"])
        .optional(),
    loanId: z.string().uuid().optional(),
});
//# sourceMappingURL=payment.schema.js.map