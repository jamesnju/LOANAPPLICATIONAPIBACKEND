import { z } from "zod";

/*

* ============================================================
* CREATE LOAN PRODUCT SCHEMA
* ============================================================
  */
  export const createLoanProductSchema = z
  .object({

  /*

  * Loan product name.
    */
    name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  /*

  * Unique loan product code.
    */
    code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code must not exceed 50 characters")
    .trim()
    .toUpperCase(),

  /*

  * Optional description.
  *
  * IMPORTANT:
  * undefined is allowed.
  * null is NOT allowed.
    */
    description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  /*

  * Minimum loan amount.
    */
    minAmount: z
    .number()
    .positive("Minimum amount must be greater than 0"),

  /*

  * Maximum loan amount.
    */
    maxAmount: z
    .number()
    .positive("Maximum amount must be greater than 0"),

  /*

  * Minimum repayment period.
    */
    minRepaymentDays: z
    .number()
    .int("Minimum repayment days must be a whole number")
    .positive("Minimum repayment days must be greater than 0"),

  /*

  * Maximum repayment period.
    */
    maxRepaymentDays: z
    .number()
    .int("Maximum repayment days must be a whole number")
    .positive("Maximum repayment days must be greater than 0"),

  /*

  * Interest rate percentage.
  *
  * Example:
  *
  * 10 = 10%
    */
    interestRate: z
    .number()
    .min(0, "Interest rate cannot be negative"),

  /*

  * Processing fee percentage.
  *
  * Example:
  *
  * 2 = 2%
    */
    processingFee: z
    .number()
    .min(0, "Processing fee cannot be negative"),

  /*

  * Late repayment penalty percentage.
  *
  * Example:
  *
  * 5 = 5%
    */
    latePenaltyRate: z
    .number()
    .min(0, "Late penalty rate cannot be negative"),

  /*

  * Whether the product is active.
    */
    isActive: z
    .boolean()
    .optional()
    .default(true),
    })

/*

* Maximum amount must be >= minimum amount.
  */
  .refine(
  (data) =>
  data.maxAmount >= data.minAmount,
  {
  message:
  "Maximum amount must be greater than or equal to minimum amount",
  path: ["maxAmount"],
  }
  )

/*

* Maximum repayment days must be >= minimum repayment days.
  */
  .refine(
  (data) =>
  data.maxRepaymentDays >=
  data.minRepaymentDays,
  {
  message:
  "Maximum repayment days must be greater than or equal to minimum repayment days",
  path: ["maxRepaymentDays"],
  }
  );

/*

* ============================================================
* UPDATE LOAN PRODUCT SCHEMA
* ============================================================
  */
  export const updateLoanProductSchema = z
  .object({

  name: z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must not exceed 100 characters")
  .trim()
  .optional(),

  code: z
  .string()
  .min(2, "Code must be at least 2 characters")
  .max(50, "Code must not exceed 50 characters")
  .trim()
  .toUpperCase()
  .optional(),

  /*

  * Optional string only.
  * null is NOT allowed.
    */
    description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  minAmount: z
  .number()
  .positive("Minimum amount must be greater than 0")
  .optional(),

  maxAmount: z
  .number()
  .positive("Maximum amount must be greater than 0")
  .optional(),

  minRepaymentDays: z
  .number()
  .int("Minimum repayment days must be a whole number")
  .positive("Minimum repayment days must be greater than 0")
  .optional(),

  maxRepaymentDays: z
  .number()
  .int("Maximum repayment days must be a whole number")
  .positive("Maximum repayment days must be greater than 0")
  .optional(),

  interestRate: z
  .number()
  .min(0, "Interest rate cannot be negative")
  .optional(),

  processingFee: z
  .number()
  .min(0, "Processing fee cannot be negative")
  .optional(),

  latePenaltyRate: z
  .number()
  .min(0, "Late penalty rate cannot be negative")
  .optional(),

  isActive: z
  .boolean()
  .optional(),
  })

/*

* Only compare amounts when both are provided.
  */
  .refine(
  (data) =>
  data.minAmount === undefined ||
  data.maxAmount === undefined ||
  data.maxAmount >= data.minAmount,
  {
  message:
  "Maximum amount must be greater than or equal to minimum amount",
  path: ["maxAmount"],
  }
  )

/*

* Only compare repayment days when both are provided.
  */
  .refine(
  (data) =>
  data.minRepaymentDays === undefined ||
  data.maxRepaymentDays === undefined ||
  data.maxRepaymentDays >=
  data.minRepaymentDays,
  {
  message:
  "Maximum repayment days must be greater than or equal to minimum repayment days",
  path: ["maxRepaymentDays"],
  }
  );

/*

* ============================================================
* LOAN PRODUCT ID SCHEMA
* ============================================================
  */
  export const loanProductIdSchema = z.object({
  id: z
  .string()
  .min(1, "Loan product ID is required"),
  });

/*

* ============================================================
* TYPES
* ============================================================
  */
  export type CreateLoanProductInput = z.infer<
  typeof createLoanProductSchema

> ;

export type UpdateLoanProductInput = z.infer<
typeof updateLoanProductSchema

> ;

export type LoanProductIdInput = z.infer<
typeof loanProductIdSchema

> ;
