import { z } from "zod";


/*
 * ============================================================
 * LOAN STATUS SCHEMAS
 * ============================================================
 */


/*
 * Loan ID
 */
export const loanStatusLoanIdSchema =
  z.object({
    loanId: z.string().uuid("Invalid loan ID"),
  });


/*
 * Loan ID used by /:id routes.
 */
export const loanStatusIdSchema =
  z.object({
    id: z.string().uuid("Invalid loan ID"),
  });