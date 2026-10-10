// src/controllers/loan.controller.ts
import { Request, Response } from "express";
import z from "zod";

import {
  createLoanFromApplication,
  disburseLoan,
  getAdminLoans,
  getLoanTransactions,
  getMyLoans,
} from "../services/loan.service.js";

import {
  applicationIdSchema,
  disburseLoanSchema,
  loanIdSchema,
} from "../schemas/loan.schema.js";

import {
  LoanStatus,
  DocumentType,
} from "../generated/prisma/enums.js";

import { prisma } from "../config/prisma.js";
import { uploadBufferToStorage } from "../services/storage.service.js";
import { renderDisbursementReceipt } from "../services/receipt.service.js";

/* ============================================================
 * GET ADMIN LOANS
 * ============================================================
 * GET /api/v1/loans
 */

export async function getAdminLoansController(
  req: Request,
  res: Response,
) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const status = req.query.status as LoanStatus | undefined;

    const result = await getAdminLoans({ status, page, limit });

    return res.json({
      success: true,
      items: result.items,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message ?? "Failed to list loans",
    });
  }
}

/* ============================================================
 * CREATE LOAN FROM APPROVED APPLICATION
 * ============================================================
 * POST /api/v1/loans/from-application/:applicationId
 */

export async function createLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { applicationId } = applicationIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const loan = await createLoanFromApplication(applicationId, userId);

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create loan",
    });
  }
}

/* ============================================================
 * GET LOAN BY ID
 * ============================================================
 * GET /api/v1/loans/:id
 */

export async function getLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const loan = await getLoanById(id, userId);

    return res.status(200).json({
      success: true,
      message: "Loan retrieved successfully",
      data: loan,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve loan",
    });
  }
}

/* ============================================================
 * GET MY LOANS
 * ============================================================
 * GET /api/v1/loans/me
 */

export async function getMyLoansController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user!.userId;

    const loans = await getMyLoans(userId);

    return res.status(200).json({
      success: true,
      message: "Loans retrieved successfully",
      data: loans,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve loans",
    });
  }
}

/* ============================================================
 * DISBURSE LOAN
 * ============================================================
 * POST /api/v1/loans/:id/disburse
 */

export async function disburseLoanController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanIdSchema.parse(req.params);

    const data = disburseLoanSchema.parse(req.body);

    const financeUserId = req.user!.userId;

    const result = await disburseLoan(
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
      message: error.message || "Failed to disburse loan",
    });
  }
}

/* ============================================================
 * GET LOAN TRANSACTIONS
 * ============================================================
 * GET /api/v1/loans/:id/transactions
 */

export async function getLoanTransactionsController(
  req: Request,
  res: Response,
) {
  try {
    const { id } = loanIdSchema.parse(req.params);

    const userId = req.user!.userId;

    const transactions = await getLoanTransactions(id, userId);

    return res.status(200).json({
      success: true,
      message: "Loan transactions retrieved successfully",
      data: transactions,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve loan transactions",
    });
  }
}

/* ============================================================
 * UPLOAD ID PHOTO (front / back of National ID)
 * ============================================================
 * POST /api/v1/loans/:id/id-photos
 *   :id   → loan application ID
 *   body  → { type: "NATIONAL_ID_FRONT" | "NATIONAL_ID_BACK" }
 *   file  → multipart/form-data field "file" (image/*)
 */

const uploadIdPhotoParamsSchema = z.object({
  id: z.string().uuid("Invalid application id"),
});

const uploadIdPhotoBodySchema = z.object({
  type: z.enum([
    DocumentType.NATIONAL_ID_FRONT,
    DocumentType.NATIONAL_ID_BACK,
  ]),
});

export async function uploadIdPhotoController(
  req: Request,
  res: Response,
) {
  try {
    const { id: applicationId } = uploadIdPhotoParamsSchema.parse(req.params);
    const { type } = uploadIdPhotoBodySchema.parse(req.body);

    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "No file uploaded" });
    }

    const userId = req.user!.userId;

    const application = await prisma.loanApplication.findFirst({
      where: { id: applicationId, userId },
      select: { id: true, status: true },
    });

    if (!application) {
      return res
        .status(404)
        .json({ ok: false, error: "Loan application not found" });
    }

    if (
      application.status === "APPROVED" ||
      application.status === "REJECTED" ||
      application.status === "DISBURSED"
    ) {
      return res.status(400).json({
        ok: false,
        error: `Cannot upload documents for an application in status ${application.status}`,
      });
    }

    const { url } = await uploadBufferToStorage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      folder: `loan-applications/${applicationId}/id-photos`,
    });

    const existing = await prisma.document.findFirst({
      where: { applicationId, type },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.document.update({
          where: { id: existing.id },
          data: {
            fileUrl: url,
            fileName: file.originalname,   // ← required
            status: "PENDING",
          },
        })
      : await prisma.document.create({
          data: {
            applicationId,
            userId,                        // ← required
            type,
            fileUrl: url,
            fileName: file.originalname,   // ← required
            status: "PENDING",
          },
        });

    return res.status(200).json({ ok: true, document: saved });
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({
        ok: false,
        error: error.issues[0]?.message ?? "Invalid request",
      });
    }
    console.error("[uploadIdPhotoController]", error);
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Failed to upload ID photo",
    });
  }
}


/* ============================================================
 * DOWNLOAD LOAN RECEIPT (PDF)
 * ============================================================
 * GET /api/v1/loans/:id/receipt
 *
 * Streams a disbursement receipt as PDF.
 *
 * Access control:
 *   - staff (ADMIN / FINANCE_OFFICER / LOAN_OFFICER / SUPPORT / SUPER_ADMIN)
 *     can download any loan's receipt
 *   - customers can only download their own
 *
 * Handled by getLoanById's existing authorization check, so we
 * don't duplicate it here.
 * ============================================================ */
export async function downloadLoanReceiptController(
  req: Request,
  res: Response,
) {
  try {
    /* ------------------------------------------------------------
     * 1. Validate params
     * ------------------------------------------------------------ */
    const { id } = loanIdSchema.parse(req.params);
    const userId = req.user!.userId;

    /* ------------------------------------------------------------
     * 2. Load loan + enforce access (throws if not allowed)
     * ------------------------------------------------------------ */
    const loan = await getLoanById(id, userId);

    /* ------------------------------------------------------------
     * 3. Guard: only disbursed loans have a receipt.
     * ------------------------------------------------------------ */
    if (
      loan.status === "PENDING_DISBURSEMENT" ||
      loan.status === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This loan has not been disbursed yet — no receipt available.",
      });
    }

    /* ------------------------------------------------------------
     * 4. Gather the metadata the receipt needs.
     *    Both queries are independent — run them in parallel.
     * ------------------------------------------------------------ */
    const [transaction, auditEntry] = await Promise.all([
      prisma.loanTransaction.findFirst({
        where: { loanId: id, type: "DISBURSEMENT" },
        orderBy: { createdAt: "asc" },
      }),
      prisma.auditLog.findFirst({
        where: {
          entity: "Loan",
          entityId: id,
          action: "DISBURSE",
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    /* ------------------------------------------------------------
     * 5. Set PDF response headers.
     *
     *    `inline` opens in the browser's PDF viewer.
     *    Swap to `attachment` if you'd rather force a download.
     * ------------------------------------------------------------ */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Receipt-${loan.loanNumber}.pdf"`,
    );

    /* ------------------------------------------------------------
     * 6. Render the PDF and stream it.
     *
     *    `renderDisbursementReceipt` returns a PDFKit stream.
     *    Piping it to `res` sends bytes as they're generated,
     *    so we don't hold the whole file in memory server-side.
     * ------------------------------------------------------------ */
    const doc = renderDisbursementReceipt({
      loan: {
        id: loan.id,
        loanNumber: loan.loanNumber,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        interestAmount: loan.interestAmount,
        processingFee: loan.processingFee,
        penaltyAmount: loan.penaltyAmount,
        totalAmount: loan.totalAmount,
        amountPaid: loan.amountPaid,
        outstandingAmount: loan.outstandingAmount,
        repaymentDays: loan.repaymentDays,
        disbursedAt: loan.disbursedAt,
        maturityDate: loan.maturityDate,
        status: loan.status,
        loanProduct: loan.loanProduct ?? null,
      },
      customer: {
        id: loan.user.id,
        firstName: loan.user.firstName,
        lastName: loan.user.lastName,
        email: loan.user.email,
        phone: loan.user.phone ?? null,
        nationalId: loan.user.nationalId ?? null,
      },
      disbursedBy: auditEntry?.user ?? null,
      transaction: transaction
        ? {
            transactionNumber: transaction.transactionNumber,
            reference: transaction.reference,
            description: transaction.description,
            createdAt: transaction.createdAt,
          }
        : null,
      company: {
        name: "PesaMaishaCapital",
        phone: "+254 700 747 874",
        email: "support@pesamaishacapital.co.ke",
      },
    });

    /* If the client disconnects mid-stream, destroy the doc so
     * PDFKit stops generating pages we'll never send. */
    res.on("close", () => {
      if (!doc.closed) doc.destroy();
    });

    doc.pipe(res);
  } catch (error: any) {
    /* ------------------------------------------------------------
     * Error handling.
     *
     * The catch runs before any bytes have been written to the
     * response, so it's safe to send JSON here. Once we've called
     * `doc.pipe(res)` the response is committed and this block
     * won't fire.
     * ------------------------------------------------------------ */
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request",
      });
    }
    console.error("[downloadLoanReceiptController]", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate receipt",
    });
  }
}
export async function getLoanById(
  loanId: string,
  requestingUserId: string,
) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true, // ← required by the receipt
        },
      },
      loanProduct: true,
      application: {
        select: {
          id: true,
          applicationNumber: true,
          requestedAmount: true,
          requestedDays: true,
          purpose: true,
          status: true,
        },
      },
      repaymentSchedules: {
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  if (!loan) throw new Error("Loan not found");

  /* Access check — same as before. */
  const requester = await prisma.user.findUnique({
    where: { id: requestingUserId },
    select: { role: true },
  });
  if (!requester) throw new Error("User not found");

  const isStaff =
    requester.role === "SUPER_ADMIN" ||
    requester.role === "ADMIN" ||
    requester.role === "LOAN_OFFICER" ||
    requester.role === "FINANCE_OFFICER" ||
    requester.role === "SUPPORT";

  if (!isStaff && loan.userId !== requestingUserId) {
    throw new Error("You are not authorized to view this loan");
  }

  return loan;
}