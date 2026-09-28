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