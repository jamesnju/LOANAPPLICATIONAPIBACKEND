import { Request, Response } from "express";
import { idParamSchema } from "../schemas/kyc.schema.js";
import { createLoanApplicationSchema, loanApplicationQuerySchema, cancelLoanApplicationSchema } from "../schemas/loanApplication.schema.js";
import { createLoanApplication, getCustomerLoanApplications, getCustomerLoanApplication, cancelLoanApplication, submitLoanApplication, getMyDraftApplication, deleteDraftApplication } from "../services/loanApplication.service.js";






function getUserId(req: Request): string {
  const user = (req as any).user;

  if (!user?.userId) {          
    throw new Error("Unauthorized");
  }

  return user.userId;            
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


/*
 * PATCH /api/v1/loan-applications/:id/submit
 */
export async function submitLoanApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const customerId = getUserId(req);
    const { id } = idParamSchema.parse(req.params);

    const application = await submitLoanApplication(customerId, id);

    return res.json({ success: true, data: application });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
export async function getMyDraftApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user!.userId;
    const draft = await getMyDraftApplication(userId);

    return res.json({
      success: true,
      data: draft,   // null when there's no draft
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to load draft",
    });
  }
}
export async function deleteDraftApplicationController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user!.userId;

    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    const result = await deleteDraftApplication(id, userId);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Delete failed",
    });
  }
}
