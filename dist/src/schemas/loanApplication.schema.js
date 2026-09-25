import { z } from "zod";
/*
 * ============================================================
 * APPLICATION STATUS
 * ============================================================
 */
const applicationStatusSchema = z.enum([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "DOCUMENTS_REQUIRED",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "DISBURSED",
]);
/*
 * ============================================================
 * CREATE LOAN APPLICATION
 * ============================================================
 *
 * POST /api/v1/loan-applications
 *
 * Matches Prisma LoanApplication:
 *
 * loanProductId
 * requestedAmount
 * requestedDays
 * purpose
 * description
 */
export const createLoanApplicationSchema = z.object({
    /*
     * Loan product being requested.
     */
    loanProductId: z
        .string()
        .uuid("Invalid loan product ID"),
    /*
     * Amount requested by the customer.
     */
    requestedAmount: z
        .number()
        .positive("Requested amount must be greater than zero"),
    /*
     * Requested repayment period.
     */
    requestedDays: z
        .number()
        .int("Requested days must be a whole number")
        .positive("Requested days must be greater than zero"),
    /*
     * Reason for requesting the loan.
     */
    purpose: z
        .string()
        .trim()
        .min(3, "Purpose must be at least 3 characters")
        .max(500, "Purpose cannot exceed 500 characters"),
    /*
     * Additional description.
     */
    description: z
        .string()
        .trim()
        .max(2000, "Description cannot exceed 2000 characters")
        .nullable()
        .optional(),
});
/*
 * ============================================================
 * CUSTOMER APPLICATION QUERY
 * ============================================================
 *
 * GET /api/v1/loan-applications
 */
export const loanApplicationQuerySchema = z.object({
    /*
     * Pagination.
     */
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    /*
     * Optional application status filter.
     */
    status: applicationStatusSchema.optional(),
    /*
     * Allowed sorting fields.
     *
     * These fields exist on LoanApplication.
     */
    sortBy: z
        .enum([
        "createdAt",
        "updatedAt",
        "requestedAmount",
        "requestedDays",
        "status",
    ])
        .default("createdAt"),
    sortOrder: z
        .enum(["asc", "desc"])
        .default("desc"),
});
/*
 * ============================================================
 * CANCEL APPLICATION
 * ============================================================
 *
 * PATCH /api/v1/loan-applications/:id/cancel
 */
export const cancelLoanApplicationSchema = z.object({
    /*
     * Optional reason supplied by customer.
     */
    reason: z
        .string()
        .trim()
        .max(500, "Cancellation reason cannot exceed 500 characters")
        .nullable()
        .optional(),
});
/*
 * ============================================================
 * ADMIN APPLICATION QUERY
 * ============================================================
 *
 * GET /api/v1/admin/loan-applications
 *
 * Admin needs additional filters:
 *
 * loanProductId
 * userId
 * search
 */
export const adminLoanApplicationQuerySchema = z.object({
    /*
     * Pagination.
     */
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    /*
     * Application status.
     */
    status: applicationStatusSchema.optional(),
    /*
     * Filter by loan product.
     */
    loanProductId: z
        .string()
        .uuid("Invalid loan product ID")
        .optional(),
    /*
     * Filter by customer/user.
     */
    userId: z
        .string()
        .uuid("Invalid user ID")
        .optional(),
    /*
     * Search application/customer details.
     */
    search: z
        .string()
        .trim()
        .max(100, "Search cannot exceed 100 characters")
        .optional(),
    /*
     * Sorting.
     */
    sortBy: z
        .enum([
        "createdAt",
        "updatedAt",
        "requestedAmount",
        "requestedDays",
        "status",
    ])
        .default("createdAt"),
    sortOrder: z
        .enum(["asc", "desc"])
        .default("desc"),
});
/*
 * ============================================================
 * REVIEW LOAN APPLICATION
 * ============================================================
 *
 * PATCH /api/v1/admin/loan-applications/:id/review
 *
 * This matches the Prisma ApprovalAction enum:
 *
 * SUBMIT
 * REVIEW
 * APPROVE
 * REJECT
 * CANCEL
 * REQUEST_DOCUMENTS
 */
export const reviewLoanApplicationSchema = z
    .object({
    /*
     * Action being performed by the reviewer.
     */
    action: z.enum([
        "REVIEW",
        "APPROVE",
        "REJECT",
        "REQUEST_DOCUMENTS",
    ]),
    /*
     * Reviewer's comments.
     */
    comments: z
        .string()
        .trim()
        .max(2000, "Comments cannot exceed 2000 characters")
        .nullable()
        .optional(),
})
    .superRefine((data, ctx) => {
    /*
     * Rejection must have a reason.
     */
    if (data.action === "REJECT" &&
        !data.comments) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["comments"],
            message: "Comments are required when rejecting an application",
        });
    }
    /*
     * Document requests must explain
     * what documents are required.
     */
    if (data.action === "REQUEST_DOCUMENTS" &&
        !data.comments) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["comments"],
            message: "Comments are required when requesting documents",
        });
    }
});
//# sourceMappingURL=loanApplication.schema.js.map