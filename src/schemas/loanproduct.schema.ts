
import { z } from "zod";


/*
 * CREATE LOAN PRODUCT SCHEMA
 *
 * POST /api/v1/loan-products
 */
export const createLoanProductSchema = z
  .object({

    /*
     * Loan product name
     *
     * Example:
     * Standard Loan
     */
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name cannot exceed 150 characters"),


    /*
     * Unique product code
     *
     * Example:
     * STANDARD_LOAN
     */
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(50, "Code cannot exceed 50 characters")
      .regex(
        /^[A-Z0-9_]+$/,
        "Code must contain only uppercase letters, numbers and underscores"
      ),


    /*
     * Product description
     */
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),


    /*
     * Minimum loan amount
     */
    minAmount: z
      .number()
      .positive(
        "Minimum amount must be greater than zero"
      ),


    /*
     * Maximum loan amount
     */
    maxAmount: z
      .number()
      .positive(
        "Maximum amount must be greater than zero"
      ),


    /*
     * Minimum repayment period
     */
    minRepaymentDays: z
      .number()
      .int(
        "Minimum repayment days must be a whole number"
      )
      .positive(
        "Minimum repayment days must be greater than zero"
      ),


    /*
     * Maximum repayment period
     */
    maxRepaymentDays: z
      .number()
      .int(
        "Maximum repayment days must be a whole number"
      )
      .positive(
        "Maximum repayment days must be greater than zero"
      ),


    /*
     * Interest rate
     *
     * Example:
     * 5 = 5%
     */
    interestRate: z
      .number()
      .min(
        0,
        "Interest rate cannot be negative"
      ),


    /*
     * Processing fee
     *
     * Example:
     * 2 = 2%
     */
    processingFee: z
      .number()
      .min(
        0,
        "Processing fee cannot be negative"
      ),


    /*
     * Late payment penalty rate
     */
    latePenaltyRate: z
      .number()
      .min(
        0,
        "Late penalty rate cannot be negative"
      ),


    /*
     * Whether the product is active
     */
    isActive: z
      .boolean()
      .default(true),
  })


  /*
   * Validate amount range
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
   * Validate repayment period range
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
 * UPDATE LOAN PRODUCT SCHEMA
 *
 * PUT /api/v1/loan-products/:id
 *
 * All fields are optional because an update
 * can modify only one field.
 */
export const updateLoanProductSchema = z
  .object({

    /*
     * Loan product name
     */
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name cannot exceed 150 characters")
      .optional(),


    /*
     * Unique product code
     */
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(50, "Code cannot exceed 50 characters")
      .regex(
        /^[A-Z0-9_]+$/,
        "Code must contain only uppercase letters, numbers and underscores"
      )
      .optional(),


    /*
     * Product description
     */
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),


    /*
     * Minimum loan amount
     */
    minAmount: z
      .number()
      .positive(
        "Minimum amount must be greater than zero"
      )
      .optional(),


    /*
     * Maximum loan amount
     */
    maxAmount: z
      .number()
      .positive(
        "Maximum amount must be greater than zero"
      )
      .optional(),


    /*
     * Minimum repayment period
     */
    minRepaymentDays: z
      .number()
      .int(
        "Minimum repayment days must be a whole number"
      )
      .positive(
        "Minimum repayment days must be greater than zero"
      )
      .optional(),


    /*
     * Maximum repayment period
     */
    maxRepaymentDays: z
      .number()
      .int(
        "Maximum repayment days must be a whole number"
      )
      .positive(
        "Maximum repayment days must be greater than zero"
      )
      .optional(),


    /*
     * Interest rate
     */
    interestRate: z
      .number()
      .min(
        0,
        "Interest rate cannot be negative"
      )
      .optional(),


    /*
     * Processing fee
     */
    processingFee: z
      .number()
      .min(
        0,
        "Processing fee cannot be negative"
      )
      .optional(),


    /*
     * Late payment penalty rate
     */
    latePenaltyRate: z
      .number()
      .min(
        0,
        "Late penalty rate cannot be negative"
      )
      .optional(),


    /*
     * Activate or deactivate product
     */
    isActive: z
      .boolean()
      .optional(),
  })


  /*
   * Validate amount range when both values
   * are supplied in the update.
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
   * Validate repayment period when both
   * values are supplied.
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

