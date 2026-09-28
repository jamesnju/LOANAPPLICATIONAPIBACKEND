import { z } from "zod";
export const applicationIdSchema = z.object({
    applicationId: z.string().uuid(),
});
export const guarantorIdSchema = z.object({
    id: z.string().uuid(),
});
export const createGuarantorSchema = z.object({
    userId: z
        .string()
        .uuid()
        .nullable()
        .optional(),
    firstName: z
        .string()
        .min(2)
        .max(100),
    lastName: z
        .string()
        .min(2)
        .max(100),
    phone: z
        .string()
        .min(9)
        .max(20),
    email: z
        .string()
        .email()
        .nullable()
        .optional(),
    nationalId: z
        .string()
        .min(3)
        .max(50),
    relationship: z
        .string()
        .max(100)
        .nullable()
        .optional(),
    guaranteedAmount: z
        .coerce
        .number()
        .positive()
        .nullable()
        .optional(),
});
export const updateGuarantorSchema = createGuarantorSchema.partial();
export const verifyGuarantorSchema = z.object({
    isVerified: z.boolean(),
});
//# sourceMappingURL=guarantor.schema.js.map