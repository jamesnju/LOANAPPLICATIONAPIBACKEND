import { z } from "zod";
/*
 * ============================================================
 * LOAN APPLICATION ID
 * ============================================================
 */
export const loanApplicationIdSchema = z.object({
    id: z.string().uuid("Invalid loan application ID"),
});
/*
 * ============================================================
 * REVIEW APPLICATION
 * ============================================================
 *
 * Used by the Loan Officer when starting the review.
 *
 * PATCH
 * /api/v1/loan-applications/:id/review
 */
export const reviewLoanApplicationSchema = z.object({
    comments: z
        .string()
        .trim()
        .max(2000, "Comments cannot exceed 2000 characters")
        .optional(),
});
/*
 * ============================================================
 * REQUEST DOCUMENTS
 * ============================================================
 *
 * Used when the reviewer needs additional documents.
 *
 * PATCH
 * /api/v1/loan-applications/:id/request-documents
 */
export const requestDocumentsSchema = z.object({
    comments: z
        .string()
        .trim()
        .min(1, "Comments are required when requesting documents")
        .max(2000, "Comments cannot exceed 2000 characters"),
});
/*
 * ============================================================
 * APPROVE APPLICATION
 * ============================================================
 *
 * Only the checker/final approver should use this.
 *
 * PATCH
 * /api/v1/loan-applications/:id/approve
 */
export const approveLoanApplicationSchema = z.object({
    comments: z
        .string()
        .trim()
        .max(2000, "Comments cannot exceed 2000 characters")
        .optional(),
});
/*
 * ============================================================
 * REJECT APPLICATION
 * ============================================================
 */
export const rejectLoanApplicationSchema = z.object({
    comments: z
        .string()
        .trim()
        .min(1, "Rejection reason is required")
        .max(2000, "Comments cannot exceed 2000 characters"),
});
//# sourceMappingURL=loanApplicationApproval.schema.js.map