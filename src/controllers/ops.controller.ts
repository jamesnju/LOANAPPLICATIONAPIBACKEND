import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { reconcilePendingStkRequests } from "../services/payment.service.js";

import { logAction } from "../services/auditLog.service.js";
import { runLoanOverdueJob, runOverdueSchedulesJob, runRepaymentRemindersJob } from "../jobs/loan.jobs.js";

/* ============================================================
 * Registry of jobs admins can trigger manually.
 *
 * Each entry declares:
 *   - handler: the async function to run
 *   - label: human-readable description for the UI
 *   - category: for grouping in the console
 *   - dangerous: whether to show a confirmation dialog
 * ============================================================ */
export const OPS_JOBS = {
  "send-repayment-reminders": {
    handler: runRepaymentRemindersJob,
    label: "Send repayment reminders",
    description:
      "Send a reminder to every customer whose installment is due in 5 days.",
    category: "Notifications",
    dangerous: false,
  },
  "send-overdue-notifications": {
    handler: runLoanOverdueJob,
    label: "Send overdue notifications",
    description:
      "Mark loans as overdue and notify the affected customers. Safe to run multiple times.",
    category: "Notifications",
    dangerous: false,
  },
  "reconcile-payments": {
    handler: reconcilePendingStkRequests,
    label: "Reconcile stuck payments",
    description:
      "Query Safaricom for any M-Pesa payment stuck in PENDING and resolve it. Safe to run anytime.",
    category: "Payments",
    dangerous: false,
  },
  "update-overdue-schedules": {
    handler: runOverdueSchedulesJob,
    label: "Update overdue schedules",
    description:
      "Mark past-due repayment installments as OVERDUE.",
    category: "Loans",
    dangerous: false,
  },
} as const;

export type OpsJobKey = keyof typeof OPS_JOBS;

/* ============================================================
 * GET /ops/jobs — list available jobs
 * ============================================================ */
export async function listOpsJobsController(_req: Request, res: Response) {
  const jobs = Object.entries(OPS_JOBS).map(([key, meta]) => ({
    key,
    label: meta.label,
    description: meta.description,
    category: meta.category,
    dangerous: meta.dangerous,
  }));
  return res.json({ ok: true, jobs });
}

/* ============================================================
 * POST /ops/jobs/:key/run — run a job
 * ============================================================ */
export async function runOpsJobController(req: Request, res: Response) {
  const key = req.params.key as OpsJobKey;
  const job = OPS_JOBS[key];

  if (!job) {
    return res.status(404).json({ ok: false, message: "Unknown job" });
  }

  const adminId = req.user!.userId;
  const startedAt = Date.now();

  /* Audit log BEFORE running — if the job crashes the server, we
   * still know who tried and when. */
  await logAction({
    userId: adminId,
    action: "OTHER",
    entity: "OpsJob",
    entityId: key,
    description: `Admin triggered ops job: ${job.label}`,
    newValue: { jobKey: key, startedAt: new Date() },
  });

  try {
    const result = await job.handler();
    const durationMs = Date.now() - startedAt;

    /* Audit log AFTER with the result. */
    await logAction({
      userId: adminId,
      action: "OTHER",
      entity: "OpsJob",
      entityId: key,
      description: `Ops job completed: ${job.label}`,
      newValue: { jobKey: key, durationMs, result },
    });

    return res.json({
      ok: true,
      jobKey: key,
      label: job.label,
      durationMs,
      result,
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    await logAction({
      userId: adminId,
      action: "OTHER",
      entity: "OpsJob",
      entityId: key,
      description: `Ops job FAILED: ${job.label}`,
      newValue: {
        jobKey: key,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      },
    });

    return res.status(500).json({
      ok: false,
      jobKey: key,
      message: err instanceof Error ? err.message : "Job failed",
      durationMs,
    });
  }
}

/* ============================================================
 * GET /ops/jobs/history — recent runs
 * ============================================================ */
export async function getOpsJobHistoryController(req: Request, res: Response) {
  const rows = await prisma.auditLog.findMany({
    where: {
      entity: "OpsJob",
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return res.json({ ok: true, history: rows });
}