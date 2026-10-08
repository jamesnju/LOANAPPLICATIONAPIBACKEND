import { z } from "zod";
/**
 * REGISTER
 */
export const registerSchema = z.object({
    firstName: z.string()
        .trim()
        .min(2, "First name is required"),
    lastName: z.string()
        .trim()
        .min(2, "Last name is required"),
    email: z.string()
        .trim()
        .email("Invalid email address"),
    phone: z.string()
        .trim()
        .min(10, "Invalid phone number"),
    password: z.string()
        .min(8, "Password must be at least 8 characters"),
    verificationChannel: z.enum([
        "EMAIL",
        "SMS",
    ]),
});
/**
 * VERIFY ACCOUNT
 */
export const verifyAccountSchema = z.object({
    userId: z.string()
        .uuid("Invalid user ID"),
    code: z.string()
        .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});
/**
 * LOGIN
 */
export const loginSchema = z.object({
    identifier: z.string()
        .trim()
        .min(1, "Email or phone is required"),
    password: z.string()
        .min(1, "Password is required"),
});
/**
 * REFRESH TOKEN
 */
export const refreshTokenSchema = z.object({
    refreshToken: z.string()
        .min(1, "Refresh token is required"),
});
/**
 * LOGOUT
 */
export const logoutSchema = z.object({
    refreshToken: z.string()
        .min(1, "Refresh token is required"),
});
/**
 * RESEND OTP
 */
export const resendOtpSchema = z.object({
    userId: z.string()
        .uuid("Invalid user ID"),
    verificationChannel: z.enum([
        "EMAIL",
        "SMS",
    ]),
});
export const googleLoginSchema = z.object({
    idToken: z.string().min(1, "Google ID token is required"),
    intent: z.enum(["login", "register"]).default("login"),
});
/* ...existing exports... */
/*
 * ============================================================
 * FORGOT PASSWORD — REQUEST
 * ============================================================
 *
 * User submits their email (or phone). We send an OTP.
 * We always respond 200 regardless of whether the account
 * exists, to avoid user enumeration.
 */
export const forgotPasswordSchema = z.object({
    identifier: z
        .string()
        .trim()
        .min(3, "Email or phone is required")
        .max(200),
});
/*
 * ============================================================
 * FORGOT PASSWORD — VERIFY OTP
 * ============================================================
 *
 * Optional intermediate step if your UI wants to verify the
 * OTP before showing the new-password form.
 */
export const verifyResetOtpSchema = z.object({
    identifier: z.string().trim().min(3).max(200),
    code: z.string().trim().length(6, "Code must be 6 digits"),
});
/*
 * ============================================================
 * FORGOT PASSWORD — RESET
 * ============================================================
 */
export const resetPasswordSchema = z
    .object({
    identifier: z.string().trim().min(3).max(200),
    code: z.string().trim().length(6, "Code must be 6 digits"),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100),
    confirmPassword: z.string().min(1),
})
    .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
//# sourceMappingURL=auth.schema.js.map