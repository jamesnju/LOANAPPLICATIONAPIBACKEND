import { z } from "zod";


/*
 * ============================================================
 * LOAN TRANSACTION SCHEMAS
 * ============================================================
 */


/*
 * Transaction ID
 */
export const loanTransactionIdSchema = z.object({
  id: z.string().uuid("Invalid transaction ID"),
});


/*
 * Loan ID
 */
export const loanTransactionLoanIdSchema =
  z.object({
    loanId: z.string().uuid("Invalid loan ID"),
  });