import type { Request, Response } from "express";

import {
  initiateLoanRepayment,
  handleStkCallback,
  type MpesaCallbackBody,
  applyPaymentToLoan,
} from "../services/payment.service.js";

import {
  initiateStkPushSchema,
  manualPaymentSchema,
  listPaymentsQuerySchema,
} from "../schemas/payment.schema.js";
import { prisma } from "../config/prisma.js";
import { PaymentMethod, PaymentStatus } from "../generated/prisma/client.js";

/* ============================================================
 * POST /payments/mpesa/stk-push
 * ============================================================
 * Customer initiates an STK Push for their loan.
 * ============================================================ */
export async function initiateStkPushController(req: Request, res: Response) {
  console.log("[stk] ─── REQUEST RECEIVED ───");
  console.log("[stk] user:", req.user?.userId);
  console.log("[stk] body:", req.body);
  try {
    const customerId = req.user!.userId;
    const input = initiateStkPushSchema.parse(req.body);

    const result = await initiateLoanRepayment(customerId, input);

    console.log("[stk] ─── RESPONSE SENT ───");
    console.log("[stk] result:", result);
    console.log("[stk] ──────────────────────");
    return res.status(202).json({
      success: true,
      message: "STK Push sent. Please enter your M-Pesa PIN.",
      data: result,
    });
  } catch (err: any) {
    console.error("[stk] ─── ERROR ───");
    console.error("[stk] error:", err);
    console.error("[stk] ─────────────");
    if (err?.issues) {
      return res.status(400).json({
        success: false,
        message: err.issues[0]?.message ?? "Invalid request",
      });
    }
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to initiate STK Push",
    });
  }
}

/* ============================================================
 * POST /payments/mpesa/callback
 * ============================================================
 * Public endpoint. Called by Safaricom. No authentication.
 * Must always return 200, even on internal errors, to stop
 * Safaricom from retrying the callback in a loop.
 * ============================================================ */
export async function mpesaCallbackController(req: Request, res: Response) {
  console.log("════════════════════════════════════════════");
  console.log("[mpesa-callback] INCOMING");
  console.log("[mpesa-callback] headers.content-type:", req.headers["content-type"]);
  console.log("[mpesa-callback] body:", JSON.stringify(req.body, null, 2));
  console.log("════════════════════════════════════════════");

  try {
    const body = req.body as MpesaCallbackBody;

    if (!body?.Body?.stkCallback) {
      console.error("[mpesa-callback] ❌ malformed body shape");
      /* Return 200 so Safaricom doesn't retry. */
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const result = await handleStkCallback(body);
    console.log("[mpesa-callback] ✅ handled:", result);

    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("════════════════════════════════════════════");
    console.error("[mpesa-callback] ❌ THREW");
    console.error("[mpesa-callback] err:", err);
    if (err instanceof Error) {
      console.error("[mpesa-callback] message:", err.message);
      console.error("[mpesa-callback] stack:", err.stack);
    }
    console.error("════════════════════════════════════════════");

    /* Always return 200 to Safaricom. */
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
// export async function mpesaCallbackController(req: Request, res: Response) {
//   try {
//     const body = req.body as MpesaCallbackBody;
//     await handleStkCallback(body);
//     return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
//   } catch (err) {
//     console.error("[mpesaCallbackController]", err);
//     /* Always 200 — see comment above. We log and reconcile later. */
//     return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
//   }
// }

/* ============================================================
 * GET /payments/me
 * ============================================================
 * Customer's own payments.
 * ============================================================ */
export async function listMyPaymentsController(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const payments = await prisma.payment.findMany({
      where: { loan: { userId } },
      include: {
        loan: { select: { id: true, loanNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({ success: true, data: payments });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to load payments",
    });
  }
}

/* ============================================================
 * GET /payments
 * ============================================================
 * Admin listing.
 * ============================================================ */
export async function listPaymentsController(req: Request, res: Response) {
  try {
    const { page, limit, status, loanId } = listPaymentsQuerySchema.parse(
      req.query,
    );

    const where = {
      ...(status && { status: status as PaymentStatus }),
      ...(loanId && { loanId }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      success: true,
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({
        success: false,
        message: err.issues[0]?.message ?? "Invalid query",
      });
    }
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to list payments",
    });
  }
}

/* ============================================================
 * POST /payments/manual
 * ============================================================
 * Admin records an out-of-band payment (bank transfer, cash…).
 * ============================================================ */
export async function manualPaymentController(req: Request, res: Response) {
  try {
    const adminId = req.user!.userId;
    const input = manualPaymentSchema.parse(req.body);

    const loan = await prisma.loan.findUnique({
      where: { id: input.loanId },
      select: { id: true, userId: true, outstandingAmount: true },
    });
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const payment = await prisma.payment.create({
      data: {
        paymentReference: `PAY-MANUAL-${Date.now()}`,
        loanId: input.loanId,
        amount: input.amount,
        paymentMethod: input.paymentMethod as PaymentMethod,
        status: PaymentStatus.PENDING,
        transactionReference: input.transactionReference ?? null,
      },
    });

    await applyPaymentToLoan(payment.id);

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "REPAY",
        entity: "Payment",
        entityId: payment.id,
        description: `Manual payment recorded (${input.paymentMethod})`,
        newValue: { amount: input.amount, loanId: input.loanId },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment recorded",
      data: { paymentId: payment.id },
    });
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({
        success: false,
        message: err.issues[0]?.message ?? "Invalid request",
      });
    }
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to record payment",
    });
  }
}

/* ============================================================
 * GET /payments/:id/status
 * ============================================================
 * Client polls this after initiating an STK Push to learn the
 * outcome once the callback lands.
 * ============================================================ */
export async function getPaymentStatusController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const payment = await prisma.payment.findFirst({
      where: { id: String(id), loan: { userId } },
      select: {
        id: true,
        status: true,
        amount: true,
        paymentReference: true,
        transactionReference: true,
        failureReason: true,
        processedAt: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.json({ success: true, data: payment });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch payment",
    });
  }
}