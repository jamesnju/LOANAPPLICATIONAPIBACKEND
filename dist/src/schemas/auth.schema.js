import { z } from "zod";
export const registerSchema = z.object({
    email: z.string().email(),
    phone: z
        .string()
        .min(10)
        .max(20),
    password: z
        .string()
        .min(8)
        .max(100),
    firstName: z
        .string()
        .min(2)
        .max(50),
    lastName: z
        .string()
        .min(2)
        .max(50),
    verificationChannel: z.enum([
        "EMAIL",
        "SMS",
    ]),
});
export const verifyAccountSchema = z.object({
    userId: z.string().uuid(),
    code: z
        .string()
        .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});
export const loginSchema = z.object({
    identifier: z.string().min(1),
    password: z.string().min(1),
});
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
});
export const logoutSchema = z.object({
    refreshToken: z.string().min(1),
});
//# sourceMappingURL=auth.schema.js.map