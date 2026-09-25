
import { Request, Response } from "express";
import { idParamSchema } from "../schemas/kyc.schema.js";
import { adminLoanApplicationQuerySchema, reviewLoanApplicationSchema } from "../schemas/loanApplication.schema.js";
import { getAdminLoanApplications, getAdminLoanApplication, reviewLoanApplication } from "../services/loanApplication.service.js";






function getUserId(req: Request): string {
  const user = (req as any).user;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  return user.id;
}


/*
 * GET /api/v1/admin/loan-applications
 */
export async function getAdminLoanApplicationsController(
  req: Request,
  res: Response,
) {
  try {
    const query =
      adminLoanApplicationQuerySchema.parse(
        req.query,
      );

    const result =
      await getAdminLoanApplications(
        query,
      );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}


/*
 * GET /api/v1/admin/loan-applications/:id
 */
export async function getAdminLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const { id } =
      idParamSchema.parse(
        req.params,
      );

    const application =
      await getAdminLoanApplication(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Loan application not found",
      });
    }

    return res.json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}


/*
 * PATCH /api/v1/admin/loan-applications/:id/review
 */
export async function reviewLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const reviewerId =
      getUserId(req);

    const { id } =
      idParamSchema.parse(
        req.params,
      );

    const data =
      reviewLoanApplicationSchema.parse(
        req.body,
      );

    const result =
      await reviewLoanApplication(
        id,
        reviewerId,
        data,
      );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

