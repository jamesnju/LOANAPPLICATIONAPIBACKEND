import { z } from "zod";
/*
 * ============================================================
 * KYC ENUMS
 * ============================================================
 */
export const kycStatusSchema = z.enum([
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
]);
export const kycDocumentTypeSchema = z.enum([
    "NATIONAL_ID",
    "PASSPORT",
    "DRIVING_LICENSE",
    "SELFIE",
    "PROOF_OF_ADDRESS",
    "EMPLOYMENT_LETTER",
    "PAYSLIP",
    "BANK_STATEMENT",
    "OTHER",
]);
export const genderSchema = z.enum([
    "MALE",
    "FEMALE",
    "OTHER",
    "PREFER_NOT_TO_SAY",
]);
export const employmentStatusSchema = z.enum([
    "EMPLOYED",
    "SELF_EMPLOYED",
    "BUSINESS_OWNER",
    "STUDENT",
    "UNEMPLOYED",
    "RETIRED",
    "OTHER",
]);
/*
 * ============================================================
 * CREATE KYC
 *
 * POST /api/v1/kyc
 * ============================================================
 */
export const createKycSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2)
        .max(100),
    middleName: z
        .string()
        .trim()
        .max(100)
        .optional()
        .nullable(),
    lastName: z
        .string()
        .trim()
        .min(2)
        .max(100),
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must use YYYY-MM-DD format"),
    identificationType: z.enum([
        "NATIONAL_ID",
        "PASSPORT",
        "DRIVING_LICENSE",
    ]),
    identificationNumber: z
        .string()
        .trim()
        .min(4)
        .max(50),
    identificationCountry: z
        .string()
        .trim()
        .min(2)
        .max(100),
    gender: genderSchema.optional(),
    nationality: z
        .string()
        .trim()
        .min(2)
        .max(100),
    address: z
        .string()
        .trim()
        .min(3)
        .max(500),
    city: z
        .string()
        .trim()
        .min(2)
        .max(100),
    county: z
        .string()
        .trim()
        .max(100)
        .optional()
        .nullable(),
    country: z
        .string()
        .trim()
        .min(2)
        .max(100),
    postalCode: z
        .string()
        .trim()
        .max(30)
        .optional()
        .nullable(),
    employmentStatus: employmentStatusSchema,
    employerName: z
        .string()
        .trim()
        .max(200)
        .optional()
        .nullable(),
    jobTitle: z
        .string()
        .trim()
        .max(150)
        .optional()
        .nullable(),
    monthlyIncome: z
        .number()
        .nonnegative()
        .optional()
        .nullable(),
    incomeSource: z
        .string()
        .trim()
        .max(200)
        .optional()
        .nullable(),
});
/*
 * ============================================================
 * UPDATE KYC
 *
 * PATCH /api/v1/kyc
 * ============================================================
 */
export const updateKycSchema = createKycSchema.partial();
/*
 * ============================================================
 * KYC DOCUMENT
 *
 * POST /api/v1/kyc/documents
 * ============================================================
 */
export const createKycDocumentSchema = z.object({
    documentType: kycDocumentTypeSchema,
    documentNumber: z
        .string()
        .trim()
        .max(100)
        .optional()
        .nullable(),
    fileUrl: z
        .string()
        .url(),
    fileName: z
        .string()
        .trim()
        .min(1)
        .max(255),
    mimeType: z
        .string()
        .trim()
        .min(1)
        .max(100),
    fileSize: z
        .number()
        .int()
        .positive(),
});
/*
 * ============================================================
 * ID PARAMETERS
 * ============================================================
 */
export const idParamSchema = z.object({
    id: z.string().min(1),
});
/*
 * ============================================================
 * KYC REVIEW
 *
 * PATCH /api/v1/admin/kyc/:id/review
 * ============================================================
 */
export const reviewKycSchema = z
    .object({
    status: z.enum([
        "APPROVED",
        "REJECTED",
        "UNDER_REVIEW",
    ]),
    reviewNotes: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .nullable(),
})
    .superRefine((data, ctx) => {
    if (data.status === "REJECTED" &&
        !data.reviewNotes) {
        ctx.addIssue({
            code: "custom",
            path: ["reviewNotes"],
            message: "Review notes are required when rejecting KYC",
        });
    }
});
/*
 * ============================================================
 * ADMIN KYC QUERY
 *
 * GET /api/v1/admin/kyc
 * ============================================================
 */
export const adminKycQuerySchema = z.object({
    status: kycStatusSchema.optional(),
    search: z
        .string()
        .trim()
        .max(100)
        .optional(),
    page: z.coerce
        .number()
        .int()
        .positive()
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .default(20),
    sortBy: z
        .enum([
        "createdAt",
        "updatedAt",
        "status",
    ])
        .default("createdAt"),
    sortOrder: z
        .enum(["asc", "desc"])
        .default("desc"),
});
//# sourceMappingURL=kyc.schema.js.map