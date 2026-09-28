import type {
  Request,
  Response,
} from "express";

import {
  getAdminDashboard,
} from "../services/adminDashboard.service.js";

export async function getAdminDashboardController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const dashboard =
      await getAdminDashboard(
        req.user!.userId,
      );

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to view the admin dashboard",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message:
        "Unable to retrieve dashboard",
    });
  }
}