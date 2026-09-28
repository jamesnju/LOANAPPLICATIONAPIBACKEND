import { z } from "zod";
export const auditLogIdSchema = z.object({
    id: z.string().uuid(),
});
export const auditLogQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    entity: z.string().max(100).optional(),
    entityId: z.string().uuid().optional(),
    action: z
        .enum([
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "REJECT",
        "DISBURSE",
        "REPAY",
        "OTHER",
    ])
        .optional(),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50),
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
});
//# sourceMappingURL=auditLog.schema.js.map