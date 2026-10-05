// backend/src/schemas/document.schema.ts
import { z } from "zod";
export const documentTypeSchema = z.enum([
    "APPLICATION_FORM",
    "NATIONAL_ID",
    "NATIONAL_ID_FRONT",
    "NATIONAL_ID_BACK",
    "PASSPORT",
    "DRIVING_LICENSE",
    "SELFIE",
    "PROOF_OF_ADDRESS",
    "EMPLOYMENT_LETTER",
    "PAYSLIP",
    "BANK_STATEMENT",
    "BUSINESS_LICENSE",
    "KRA_PIN",
    "GUARANTOR_ID",
    "GUARANTOR_ID_FRONT",
    "GUARANTOR_ID_BACK",
    "GUARANTOR_PAYSLIP",
    "COLLATERAL_OWNERSHIP",
    "COLLATERAL_PHOTO",
    "OTHER",
]);
export const uploadDocumentSchema = z.object({
    type: documentTypeSchema,
    applicationId: z.string().uuid().optional(),
    guarantorId: z.string().uuid().optional(),
    collateralId: z.string().uuid().optional(),
});
/**
 * Body for POST /documents/application/:applicationId/upload
 * The URL provides the applicationId; the body just carries the type.
 */
export const uploadApplicationFormSchema = z.object({
    type: documentTypeSchema.default("APPLICATION_FORM"),
});
/**
 * Body for POST /documents/guarantor/:guarantorId/upload
 */
export const uploadGuarantorDocumentSchema = z.object({
    type: z.enum(["GUARANTOR_ID_FRONT", "GUARANTOR_ID_BACK", "OTHER"]),
});
export const rejectDocumentSchema = z.object({
    rejectionReason: z
        .string()
        .trim()
        .min(3, "Rejection reason must be at least 3 characters")
        .max(500, "Rejection reason cannot exceed 500 characters"),
});
// import { z } from "zod";
// export const documentTypeSchema = z.enum([
//   "APPLICATION_FORM",
//   "NATIONAL_ID",
//   "PASSPORT",
//   "DRIVING_LICENSE",
//   "SELFIE",
//   "PROOF_OF_ADDRESS",
//   "EMPLOYMENT_LETTER",
//   "PAYSLIP",
//   "BANK_STATEMENT",
//   "BUSINESS_LICENSE",
//   "KRA_PIN",
//   "GUARANTOR_ID",
//   "GUARANTOR_PAYSLIP",
//   "COLLATERAL_OWNERSHIP",
//   "COLLATERAL_PHOTO",
//   "OTHER",
// ]);
// /*
//  * Generic document upload — used by POST /documents.
//  * At least one of the scope ids must be present (checked in the controller).
//  */
// export const uploadDocumentSchema = z.object({
//   type: documentTypeSchema,
//   applicationId: z.string().uuid().optional(),
//   guarantorId: z.string().uuid().optional(),
//   collateralId: z.string().uuid().optional(),
// });
// /*
//  * Application-form upload — used by
//  * POST /documents/application/:applicationId/upload.
//  * The scope comes from the URL, so only metadata is in the body.
//  */
// export const uploadApplicationFormSchema = z.object({
//   // Reserved for future use (e.g. documentNumber, notes).
// });
// export const rejectDocumentSchema = z.object({
//   rejectionReason: z
//     .string()
//     .trim()
//     .min(3, "Rejection reason must be at least 3 characters")
//     .max(500, "Rejection reason cannot exceed 500 characters"),
// });
// export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
// export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>;
// export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;
//# sourceMappingURL=document.schema.js.map