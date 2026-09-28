import { Request, Response } from "express";

// import {
//   approveLoanApplication,
//   getLoanApplicationApprovalHistory,
//   rejectLoanApplication,
//   requestLoanApplicationDocuments,
//   reviewLoanApplication,
//   submitForApproval,
// } from "../services/loanApplicationApproval.service.js";

import {
  approveLoanApplicationSchema,
  loanApplicationIdSchema,
  rejectLoanApplicationSchema,
  requestDocumentsSchema,
  reviewLoanApplicationSchema,
} from "../schemas/loanApplicationApproval.schema.js";
import { approveLoanApplication, getLoanApplicationApprovalHistory, rejectLoanApplication, requestLoanApplicationDocuments, reviewLoanApplication, submitForApproval } from "../services/loanApplicationApproval.service.js";

/*
 * ============================================================
 * REVIEW
 * ============================================================
 */

export async function reviewLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const data = reviewLoanApplicationSchema.parse(req.body);

    /*
     * This assumes your authentication middleware places
     * the authenticated user on req.user.
     *
     * Adjust this line if your existing req.user structure
     * uses a different property name.
     */
    const reviewerId = req.user!.userId;

    const application = await reviewLoanApplication(
      id,
      reviewerId,
      data.comments,
    );

    return res.status(200).json({
      success: true,
      message: "Loan application moved to review",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to review loan application",
    });
  }
}

/*
 * ============================================================
 * REQUEST DOCUMENTS
 * ============================================================
 */

export async function requestDocumentsController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const data = requestDocumentsSchema.parse(req.body);

    const reviewerId = req.user!.userId;

    const application = await requestLoanApplicationDocuments(
      id,
      reviewerId,
      data.comments,
    );

    return res.status(200).json({
      success: true,
      message: "Additional documents requested",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to request additional documents",
    });
  }
}

/*
 * ============================================================
 * SUBMIT FOR APPROVAL
 * ============================================================
 */

export async function submitForApprovalController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const data = reviewLoanApplicationSchema.parse(req.body);

    const reviewerId = req.user!.userId;

    const application = await submitForApproval(
      id,
      reviewerId,
      data.comments,
    );

    return res.status(200).json({
      success: true,
      message: "Loan application submitted for approval",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to submit loan application for approval",
    });
  }
}

/*
 * ============================================================
 * APPROVE
 * ============================================================
 */

export async function approveLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const data = approveLoanApplicationSchema.parse(req.body);

    const approverId = req.user!.userId;

    const application = await approveLoanApplication(
      id,
      approverId,
      data.comments,
    );

    return res.status(200).json({
      success: true,
      message: "Loan application approved successfully",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to approve loan application",
    });
  }
}

/*
 * ============================================================
 * REJECT
 * ============================================================
 */

export async function rejectLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const data = rejectLoanApplicationSchema.parse(req.body);

    const approverId = req.user!.userId;

    const application = await rejectLoanApplication(
      id,
      approverId,
      data.comments,
    );

    return res.status(200).json({
      success: true,
      message: "Loan application rejected",
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to reject loan application",
    });
  }
}

/*
 * ============================================================
 * APPROVAL HISTORY
 * ============================================================
 */

export async function getApprovalHistoryController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanApplicationIdSchema.parse(req.params);

    const approvals =
      await getLoanApplicationApprovalHistory(id);

    return res.status(200).json({
      success: true,
      message: "Approval history retrieved successfully",
      data: approvals,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to retrieve approval history",
    });
  }
}