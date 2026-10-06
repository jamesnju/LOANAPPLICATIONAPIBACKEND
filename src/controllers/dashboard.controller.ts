// backend/src/controllers/dashboard.controller.ts
import type { Request, Response } from "express";
import {
    getAdminDashboard,
  getCustomerDashboard
} from "../services/dashboard.service.js";

/* ============================================================
 * CUSTOMER DASHBOARD
 * GET /api/v1/dashboard/customer
 * ==========================================================*/
export async function getCustomerDashboardController(
  req: Request,
  res: Response
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const data = await getCustomerDashboard(userId);

    return res.json({
      success: true,
      message: "Customer dashboard retrieved successfully",
      data,
    });
  } catch (error: any) {
    console.error("[getCustomerDashboard]", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load customer dashboard",
    });
  }
}

/* ============================================================
 * ADMIN DASHBOARD
 * GET /api/v1/dashboard/admin
 * ==========================================================*/
export async function getAdminDashboardController(
  req: Request,
  res: Response
) {
  try {
    const data = await getAdminDashboard();

    return res.json({
      success: true,
      message: "Admin dashboard retrieved successfully",
      data,
    });
  } catch (error: any) {
    console.error("[getAdminDashboard]", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load admin dashboard",
    });
  }
}