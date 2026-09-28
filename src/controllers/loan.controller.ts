import { Request, Response } from "express";

import {
  createLoanFromApplication,
  disburseLoan,
  getLoanById,
  getLoanTransactions,
  getMyLoans,
} from "../services/loan.service.js";
import { applicationIdSchema, disburseLoanSchema, loanIdSchema } from "./loan.schema.js";

// import {
//   applicationIdSchema,
//   disburseLoanSchema,
//   loanIdSchema,
// } from "../schemas/loan.schema.js";

/*
 * ============================================================
 * CREATE LOAN FROM APPROVED APPLICATION
 * ============================================================
 */

export async function createLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { applicationId } =
      applicationIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const loan =
      await createLoanFromApplication(
        applicationId,
        userId,
      );

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create loan",
    });
  }
}

/*
 * ============================================================
 * GET LOAN BY ID
 * ============================================================
 */

export async function getLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { id } =
      loanIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const loan =
      await getLoanById(
        id,
        userId,
      );

    return res.status(200).json({
      success: true,
      message: "Loan retrieved successfully",
      data: loan,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to retrieve loan",
    });
  }
}

/*
 * ============================================================
 * GET MY LOANS
 * ============================================================
 */

export async function getMyLoansController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user!.userId;

    const loans =
      await getMyLoans(userId);

    return res.status(200).json({
      success: true,
      message: "Loans retrieved successfully",
      data: loans,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to retrieve loans",
    });
  }
}

/*
 * ============================================================
 * DISBURSE LOAN
 * ============================================================
 */

export async function disburseLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { id } =
      loanIdSchema.parse(req.params);

    const data =
      disburseLoanSchema.parse(
        req.body,
      );

    const financeUserId =
      req.user!.userId;

    const result =
      await disburseLoan(
        id,
        financeUserId,
        data.paymentMethod as any,
        data.transactionReference,
        data.comments,
      );

    return res.status(200).json({
      success: true,
      message: "Loan disbursed successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to disburse loan",
    });
  }
}

/*
 * ============================================================
 * GET LOAN TRANSACTIONS
 * ============================================================
 */

export async function getLoanTransactionsController(
  req: Request,
  res: Response,
) {
  try {
    const { id } =
      loanIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const transactions =
      await getLoanTransactions(
        id,
        userId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Loan transactions retrieved successfully",
      data: transactions,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to retrieve loan transactions",
    });
  }
}