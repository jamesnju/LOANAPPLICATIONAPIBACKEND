import { z } from "zod";
/*
 * UUID parameter
 */
export const userIdSchema = z.object({
    id: z.string().uuid("Invalid user ID"),
});
/*
 * Create user
 *
 * Mainly intended for administrators creating
 * staff accounts.
 */
export const createUserSchema = z.object({
    firstName: z
        .string()
        .min(2)
        .max(100),
    lastName: z
        .string()
        .min(2)
        .max(100),
    email: z
        .string()
        .email(),
    phone: z
        .string()
        .min(9)
        .max(20),
    password: z
        .string()
        .min(8)
        .max(100),
    role: z
        .enum([
        "SUPER_ADMIN",
        "ADMIN",
        "LOAN_OFFICER",
        "FINANCE_OFFICER",
        "SUPPORT",
        "CUSTOMER",
    ])
        .default("CUSTOMER"),
    status: z
        .enum([
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "BLOCKED",
    ])
        .default("ACTIVE"),
});
/*
 * Update basic user information.
 */
export const updateUserSchema = z.object({
    firstName: z
        .string()
        .min(2)
        .max(100)
        .optional(),
    lastName: z
        .string()
        .min(2)
        .max(100)
        .optional(),
    email: z
        .string()
        .email()
        .optional(),
    phone: z
        .string()
        .min(9)
        .max(20)
        .optional(),
    nationalId: z
        .string()
        .max(50)
        .nullable()
        .optional(),
    employerName: z
        .string()
        .max(200)
        .nullable()
        .optional(),
    monthlyIncome: z
        .coerce
        .number()
        .nonnegative()
        .nullable()
        .optional(),
});
/*
 * Update user status.
 */
export const updateUserStatusSchema = z.object({
    status: z.enum([
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "BLOCKED",
        "LOCKED",
    ]),
});
/*
 * Update user role.
 */
export const updateUserRoleSchema = z.object({
    role: z.enum([
        "SUPER_ADMIN",
        "ADMIN",
        "LOAN_OFFICER",
        "FINANCE_OFFICER",
        "SUPPORT",
        "CUSTOMER",
    ]),
});
/*
 * User list filters.
 */
export const userQuerySchema = z.object({
    search: z.string().optional(),
    role: z
        .enum([
        "SUPER_ADMIN",
        "ADMIN",
        "LOAN_OFFICER",
        "FINANCE_OFFICER",
        "SUPPORT",
        "CUSTOMER",
    ])
        .optional(),
    status: z
        .enum([
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "BLOCKED",
    ])
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
});
/* ...existing exports... */
/*
 * ============================================================
 * LOCKED status added to all enums
 * ============================================================
 */
const UserStatusEnum = z.enum([
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
    "BLOCKED",
    "LOCKED",
]);
const RoleEnum = z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "LOAN_OFFICER",
    "FINANCE_OFFICER",
    "SUPPORT",
    "CUSTOMER",
]);
/*
 * ============================================================
 * SELF PROFILE — update
 * ============================================================
 *
 * Customers/staff updating their own profile.
 * Cannot change role/status/email/phone — those need verification.
 */
export const updateProfileSchema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    nationalId: z.string().max(50).nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    employmentType: z
        .enum([
        "EMPLOYED",
        "SELF_EMPLOYED",
        "BUSINESS_OWNER",
        "STUDENT",
        "UNEMPLOYED",
        "OTHER",
    ])
        .nullable()
        .optional(),
    employerName: z.string().max(200).nullable().optional(),
    monthlyIncome: z.coerce.number().nonnegative().nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
});
/*
 * ============================================================
 * SELF PROFILE — change password
 * ============================================================
 */
export const changePasswordSchema = z
    .object({
    currentPassword: z.string().min(1, "Current password is required"),
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
/*
 * ============================================================
 * SELF PROFILE — request email/phone change
 * ============================================================
 */
export const requestEmailChangeSchema = z.object({
    newEmail: z.string().email(),
});
export const requestPhoneChangeSchema = z.object({
    newPhone: z.string().min(9).max(20),
});
/*
 * ============================================================
 * ADMIN — unlock account
 * ============================================================
 */
export const unlockAccountSchema = z.object({
    // Optional note for audit log
    reason: z.string().max(500).optional(),
});
//# sourceMappingURL=user.schema.js.map