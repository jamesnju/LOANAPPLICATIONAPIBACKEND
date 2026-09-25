import { Request, Response } from "express";
import { idParamSchema } from "../schemas/kyc.schema.js";
import { createLoanApplicationSchema, loanApplicationQuerySchema, cancelLoanApplicationSchema } from "../schemas/loanApplication.schema.js";
import { createLoanApplication, getCustomerLoanApplications, getCustomerLoanApplication, cancelLoanApplication } from "../services/loanApplication.service.js";






function getUserId(req: Request): string {
  const user = (req as any).user;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  return user.id;
}


/*
 * POST /api/v1/loan-applications
 */
export async function createLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const customerId =
      getUserId(req);

    const data =
      createLoanApplicationSchema.parse(
        req.body,
      );

    const application =
      await createLoanApplication(
        customerId,
        data,
      );

    return res.status(201).json({
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
 * GET /api/v1/loan-applications
 */
export async function getCustomerLoanApplicationsController(
  req: Request,
  res: Response,
) {
  try {
    const customerId =
      getUserId(req);

    const query =
      loanApplicationQuerySchema.parse(
        req.query,
      );

    const result =
      await getCustomerLoanApplications(
        customerId,
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
 * GET /api/v1/loan-applications/:id
 */
export async function getCustomerLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const customerId =
      getUserId(req);

    const { id } =
      idParamSchema.parse(
        req.params,
      );

    const application =
      await getCustomerLoanApplication(
        customerId,
        id,
      );

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
 * PATCH /api/v1/loan-applications/:id/cancel
 */
export async function cancelLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const customerId =
      getUserId(req);

    const { id } =
      idParamSchema.parse(
        req.params,
      );

    const data =
      cancelLoanApplicationSchema.parse(
        req.body,
      );

    const application =
      await cancelLoanApplication(
        customerId,
        id,
        data,
      );

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

