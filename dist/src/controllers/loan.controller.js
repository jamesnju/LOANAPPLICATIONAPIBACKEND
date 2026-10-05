import z from "zod";
import { createLoanFromApplication, disburseLoan, getAdminLoans, getLoanById, getLoanTransactions, getMyLoans, } from "../services/loan.service.js";
import { applicationIdSchema, disburseLoanSchema, loanIdSchema, } from "../schemas/loan.schema.js";
import { DocumentType, } from "../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { uploadBufferToStorage } from "../services/storage.service.js";
/* ============================================================
 * GET ADMIN LOANS
 * ============================================================
 * GET /api/v1/loans
 */
export async function getAdminLoansController(req, res) {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const status = req.query.status;
        const result = await getAdminLoans({ status, page, limit });
        return res.json({
            success: true,
            items: result.items,
            pagination: result.pagination,
        });
    }
    catch (error) {
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
export async function createLoanController(req, res) {
    try {
        const { applicationId } = applicationIdSchema.parse(req.params);
        const userId = req.user.userId;
        const loan = await createLoanFromApplication(applicationId, userId);
        return res.status(201).json({
            success: true,
            message: "Loan created successfully",
            data: loan,
        });
    }
    catch (error) {
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
export async function getLoanController(req, res) {
    try {
        const { id } = loanIdSchema.parse(req.params);
        const userId = req.user.userId;
        const loan = await getLoanById(id, userId);
        return res.status(200).json({
            success: true,
            message: "Loan retrieved successfully",
            data: loan,
        });
    }
    catch (error) {
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
export async function getMyLoansController(req, res) {
    try {
        const userId = req.user.userId;
        const loans = await getMyLoans(userId);
        return res.status(200).json({
            success: true,
            message: "Loans retrieved successfully",
            data: loans,
        });
    }
    catch (error) {
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
export async function disburseLoanController(req, res) {
    try {
        const { id } = loanIdSchema.parse(req.params);
        const data = disburseLoanSchema.parse(req.body);
        const financeUserId = req.user.userId;
        const result = await disburseLoan(id, financeUserId, data.paymentMethod, data.transactionReference, data.comments);
        return res.status(200).json({
            success: true,
            message: "Loan disbursed successfully",
            data: result,
        });
    }
    catch (error) {
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
export async function getLoanTransactionsController(req, res) {
    try {
        const { id } = loanIdSchema.parse(req.params);
        const userId = req.user.userId;
        const transactions = await getLoanTransactions(id, userId);
        return res.status(200).json({
            success: true,
            message: "Loan transactions retrieved successfully",
            data: transactions,
        });
    }
    catch (error) {
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
export async function uploadIdPhotoController(req, res) {
    try {
        const { id: applicationId } = uploadIdPhotoParamsSchema.parse(req.params);
        const { type } = uploadIdPhotoBodySchema.parse(req.body);
        const file = req.file;
        if (!file) {
            return res
                .status(400)
                .json({ ok: false, error: "No file uploaded" });
        }
        const userId = req.user.userId;
        const application = await prisma.loanApplication.findFirst({
            where: { id: applicationId, userId },
            select: { id: true, status: true },
        });
        if (!application) {
            return res
                .status(404)
                .json({ ok: false, error: "Loan application not found" });
        }
        if (application.status === "APPROVED" ||
            application.status === "REJECTED" ||
            application.status === "DISBURSED") {
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
                    fileName: file.originalname, // ← required
                    status: "PENDING",
                },
            })
            : await prisma.document.create({
                data: {
                    applicationId,
                    userId, // ← required
                    type,
                    fileUrl: url,
                    fileName: file.originalname, // ← required
                    status: "PENDING",
                },
            });
        return res.status(200).json({ ok: true, document: saved });
    }
    catch (error) {
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
// import { Request, Response } from "express";
// import {
//   createLoanFromApplication,
//   disburseLoan,
//   getAdminLoans,
//   getLoanById,
//   getLoanTransactions,
//   getMyLoans,
// } from "../services/loan.service.js";
// import { applicationIdSchema, disburseLoanSchema, loanIdSchema } from "../schemas/loan.schema.js";
// import { LoanStatus } from "../generated/prisma/enums.js";
// export async function getAdminLoansController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const page = Number(req.query.page) || 1;
//     const limit = Math.min(Number(req.query.limit) || 20, 100);
//     const status = req.query.status as LoanStatus | undefined;
//     const result = await getAdminLoans({ status, page, limit });
//     return res.json({
//       success: true,
//       items: result.items,
//       pagination: result.pagination,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message ?? "Failed to list loans",
//     });
//   }
// }
// /*
//  * ============================================================
//  * CREATE LOAN FROM APPROVED APPLICATION
//  * ============================================================
//  */
// export async function createLoanController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const { applicationId } =
//       applicationIdSchema.parse(req.params);
//     const userId = req.user!.userId;
//     const loan =
//       await createLoanFromApplication(
//         applicationId,
//         userId,
//       );
//     return res.status(201).json({
//       success: true,
//       message: "Loan created successfully",
//       data: loan,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message:
//         error.message ||
//         "Failed to create loan",
//     });
//   }
// }
// /*
//  * ============================================================
//  * GET LOAN BY ID
//  * ============================================================
//  */
// export async function getLoanController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const { id } =
//       loanIdSchema.parse(req.params);
//     const userId = req.user!.userId;
//     const loan =
//       await getLoanById(
//         id,
//         userId,
//       );
//     return res.status(200).json({
//       success: true,
//       message: "Loan retrieved successfully",
//       data: loan,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message:
//         error.message ||
//         "Failed to retrieve loan",
//     });
//   }
// }
// /*
//  * ============================================================
//  * GET MY LOANS
//  * ============================================================
//  */
// export async function getMyLoansController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = req.user!.userId;
//     const loans =
//       await getMyLoans(userId);
//     return res.status(200).json({
//       success: true,
//       message: "Loans retrieved successfully",
//       data: loans,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message:
//         error.message ||
//         "Failed to retrieve loans",
//     });
//   }
// }
// /*
//  * ============================================================
//  * DISBURSE LOAN
//  * ============================================================
//  */
// export async function disburseLoanController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const { id } =
//       loanIdSchema.parse(req.params);
//     const data =
//       disburseLoanSchema.parse(
//         req.body,
//       );
//     const financeUserId =
//       req.user!.userId;
//     const result =
//       await disburseLoan(
//         id,
//         financeUserId,
//         data.paymentMethod as any,
//         data.transactionReference,
//         data.comments,
//       );
//     return res.status(200).json({
//       success: true,
//       message: "Loan disbursed successfully",
//       data: result,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message:
//         error.message ||
//         "Failed to disburse loan",
//     });
//   }
// }
// /*
//  * ============================================================
//  * GET LOAN TRANSACTIONS
//  * ============================================================
//  */
// export async function getLoanTransactionsController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const { id } =
//       loanIdSchema.parse(req.params);
//     const userId = req.user!.userId;
//     const transactions =
//       await getLoanTransactions(
//         id,
//         userId,
//       );
//     return res.status(200).json({
//       success: true,
//       message:
//         "Loan transactions retrieved successfully",
//       data: transactions,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message:
//         error.message ||
//         "Failed to retrieve loan transactions",
//     });
//   }
// }
//# sourceMappingURL=loan.controller.js.map