import { z } from "zod";
/*
 * Document ID.
 */
export const documentIdSchema = z.object({
    id: z.string().uuid("Invalid document ID"),
});
/*
 * Application ID.
 */
export const applicationIdSchema = z.object({
    applicationId: z.string().uuid("Invalid application ID"),
});
/*
 * Rejection request.
 */
export const rejectDocumentSchema = z.object({
    rejectionReason: z
        .string()
        .min(3, "Rejection reason is required")
        .max(1000),
});
//# sourceMappingURL=document.schema.js.map