import { z } from "zod";


/*
 * Create system configuration.
 */
export const createSystemConfigSchema = z.object({

  key: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[A-Z0-9_]+$/,
      "Key must contain only uppercase letters, numbers and underscores"
    ),

  name: z
    .string()
    .min(2)
    .max(150),

  description: z
    .string()
    .max(500)
    .optional(),

  type: z.enum([
    "STRING",
    "INTEGER",
    "DECIMAL",
    "BOOLEAN",
    "JSON",
    "DATE",
  ]),

  value: z
    .string()
    .min(1),

  defaultValue: z
    .string()
    .optional(),

  category: z
    .string()
    .min(1)
    .max(100),

  isEditable: z
    .boolean()
    .default(true),

  isActive: z
    .boolean()
    .default(true),

});


/*
 * Update system configuration.
 */
export const updateSystemConfigSchema =
  createSystemConfigSchema.partial();


/*
 * ID parameter.
 */
export const systemConfigIdSchema = z.object({

  id: z
    .string()
    .uuid(),

});