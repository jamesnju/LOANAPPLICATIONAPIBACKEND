import { z } from "zod";
export const collateralIdSchema = z.object({
    id: z.string().uuid(),
});
export const createCollateralSchema = z.object({
    type: z
        .string()
        .min(2)
        .max(100),
    description: z
        .string()
        .min(2)
        .max(1000),
    estimatedValue: z
        .coerce
        .number()
        .positive(),
    registrationNumber: z
        .string()
        .max(100)
        .nullable()
        .optional(),
    ownershipDocument: z
        .string()
        .max(500)
        .nullable()
        .optional(),
});
export const updateCollateralSchema = createCollateralSchema.partial();
export const verifyCollateralSchema = z.object({
    verified: z.boolean(),
});
//# sourceMappingURL=collateral.schema.js.map