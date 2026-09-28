import { z } from "zod";
/*
 * ============================================================
 * REPAYMENT SCHEDULE SCHEMAS
 * ============================================================
 */
/*
 * Loan ID parameter
 *
 * Used by:
 * GET /api/v1/repayment-schedules/loan/:loanId
 * POST /api/v1/repayment-schedules/loan/:loanId/generate
 */
export const loanIdSchema = z.object({
    loanId: z.string().uuid("Invalid loan ID"),
});
/*
 * Repayment Schedule ID parameter
 *
 * Used by:
 * GET /api/v1/repayment-schedules/:id
 */
export const repaymentScheduleIdSchema = z.object({
    id: z.string().uuid("Invalid repayment schedule ID"),
});
//# sourceMappingURL=repaymentSchedule.schema.js.map