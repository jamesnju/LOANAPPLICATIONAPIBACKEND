import type {
  Request,
  Response,
} from "express";

import {
  getAuditLogs,
  getAuditLogById,
} from "../services/auditLog.service.js";

import {
  auditLogQuerySchema,
} from "../schemas/auditLog.schema.js";

export async function getAuditLogsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const filters =
      auditLogQuerySchema.parse(req.query);

    const result =
      await getAuditLogs(
        req.user!.userId,
        filters,
      );

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view audit logs",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "Unable to retrieve audit logs",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
}

export async function getAuditLogController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = String(req.params.id);

    const log =
      await getAuditLogById(
        id,
        req.user!.userId,
      );

    if (!log) {
      res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view audit logs",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to retrieve audit log",
    });
  }
}