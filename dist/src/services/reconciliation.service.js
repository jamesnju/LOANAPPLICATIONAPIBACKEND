import { prisma } from "../config/prisma.js";
import { PaymentStatus } from "../generated/prisma/enums.js";
import { queryStkStatus } from "./mpesa.service.js";
import { applyPaymentToLoan } from "./payment.service.js";
import { logAction } from "./auditLog.service.js";
import { notifyUser } from "./notification.service.js";
const RECON_ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE_OFFICER"];
async function checkReconAccess(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (!user || !RECON_ROLES.includes(user.role)) {
        throw new Error("UNAUTHORIZED");
    }
}
/* ============================================================
 * SEARCH — find stuck / suspicious payments
 * ============================================================ */
export async function searchStkRequests(userId, opts) {
    await checkReconAccess(userId);
    const limit = Math.min(opts.limit ?? 50, 200);
    const where = {};
    if (opts.query) {
        const q = opts.query.trim();
        where.OR = [
            { checkoutRequestId: { contains: q } },
            { merchantRequestId: { contains: q } },
            { phone: { contains: q } },
            { payment: { transactionReference: { contains: q } } },
        ];
    }
    if (opts.status)
        where.status = opts.status;
    if (opts.fromDate || opts.toDate) {
        where.createdAt = {};
        if (opts.fromDate)
            where.createdAt.gte = opts.fromDate;
        if (opts.toDate)
            where.createdAt.lte = opts.toDate;
    }
    const rows = await prisma.mpesaStkRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            payment: {
                select: {
                    id: true,
                    paymentReference: true,
                    status: true,
                    amount: true,
                    transactionReference: true,
                    failureReason: true,
                    processedAt: true,
                },
            },
            loan: {
                select: {
                    id: true,
                    loanNumber: true,
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                },
            },
        },
    });
    return rows;
}
/* ============================================================
 * DETAIL — single request, full context
 * ============================================================ */
export async function getStkRequestDetail(userId, id) {
    await checkReconAccess(userId);
    const row = await prisma.mpesaStkRequest.findUnique({
        where: { id },
        include: {
            payment: true,
            loan: {
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                    },
                },
            },
        },
    });
    if (!row)
        throw new Error("Not found");
    return row;
}
/* ============================================================
 * LIVE QUERY — ask Safaricom
 * ============================================================
 * Useful when the callback never arrived. Updates the local
 * record with what Safaricom says, then (if success) applies
 * the payment to the loan.
 * ============================================================ */
export async function querySafaricomForRequest(userId, id) {
    await checkReconAccess(userId);
    const stk = await prisma.mpesaStkRequest.findUnique({
        where: { id },
        include: { loan: { include: { user: true } } },
    });
    if (!stk)
        throw new Error("Not found");
    if (!stk.checkoutRequestId) {
        throw new Error("This request has no CheckoutRequestID — STK Push never left our system.");
    }
    const response = await queryStkStatus(stk.checkoutRequestId);
    const resultCode = Number(response.ResultCode);
    await logAction({
        userId,
        action: "OTHER",
        entity: "MpesaStkRequest",
        entityId: stk.id,
        description: `Admin queried Safaricom for ${stk.checkoutRequestId}`,
        newValue: {
            resultCode,
            resultDesc: response.ResultDesc,
        },
    });
    /* Handle "still processing" — return without state change */
    if (response.ResponseCode !== "0") {
        return {
            safaricom: response,
            message: "Safaricom is still processing this request. Try again in a minute.",
            reconciled: false,
        };
    }
    /* ResultCode 0 = payment succeeded on Safaricom side */
    if (resultCode === 0) {
        /* Idempotency check */
        if (stk.callbackReceivedAt) {
            return {
                safaricom: response,
                message: "This request was already reconciled.",
                reconciled: false,
            };
        }
        /* Mark STK success + apply payment */
        await prisma.$transaction(async (tx) => {
            await tx.mpesaStkRequest.update({
                where: { id: stk.id },
                data: {
                    status: "SUCCESS",
                    resultCode,
                    resultDesc: response.ResultDesc,
                    reconciledAt: new Date(),
                    callbackReceivedAt: new Date(),
                },
            });
            await tx.payment.update({
                where: { id: stk.paymentId },
                data: { status: PaymentStatus.PENDING }, // applyPaymentToLoan flips it
            });
        });
        await applyPaymentToLoan(stk.paymentId);
        await notifyUser(stk.loan.userId, "PAYMENT_RECEIVED", "Payment received", `We've confirmed your payment of KES ${Number(stk.amount).toLocaleString()} for loan ${stk.loan.loanNumber}.`, { loanId: stk.loan.id, paymentId: stk.paymentId });
        return {
            safaricom: response,
            message: "Safaricom confirmed the payment. Loan has been credited.",
            reconciled: true,
        };
    }
    /* ResultCode != 0 = payment failed on Safaricom side */
    const failureStatus = resultCode === 1032 ? "CANCELLED" :
        resultCode === 1037 ? "TIMEOUT" : "FAILED";
    await prisma.$transaction([
        prisma.mpesaStkRequest.update({
            where: { id: stk.id },
            data: {
                status: failureStatus,
                resultCode,
                resultDesc: response.ResultDesc,
                reconciledAt: new Date(),
                callbackReceivedAt: new Date(),
            },
        }),
        prisma.payment.update({
            where: { id: stk.paymentId },
            data: {
                status: failureStatus === "CANCELLED"
                    ? PaymentStatus.CANCELLED
                    : PaymentStatus.FAILED,
                failureReason: response.ResultDesc,
            },
        }),
    ]);
    return {
        safaricom: response,
        message: `Safaricom reported: ${response.ResultDesc}`,
        reconciled: true,
    };
}
/* ============================================================
 * MANUAL RESOLVE
 * ============================================================
 * Admin has confirmed the payment (e.g., via M-Pesa statement,
 * customer-provided SMS, or Safaricom support). Manually mark
 * complete with the receipt number.
 * ============================================================ */
export async function manuallyResolveStkRequest(userId, id, opts) {
    await checkReconAccess(userId);
    const stk = await prisma.mpesaStkRequest.findUnique({
        where: { id },
        include: { loan: { include: { user: true } }, payment: true },
    });
    if (!stk)
        throw new Error("Not found");
    /* Idempotency — refuse if already resolved */
    if (stk.payment?.status === PaymentStatus.COMPLETED) {
        throw new Error("This payment is already marked completed.");
    }
    const amount = opts.amount ?? Number(stk.amount);
    await prisma.$transaction(async (tx) => {
        await tx.mpesaStkRequest.update({
            where: { id: stk.id },
            data: {
                status: "SUCCESS",
                resultCode: 0,
                resultDesc: "Manually resolved by admin",
                reconciledAt: new Date(),
                callbackReceivedAt: new Date(),
            },
        });
        await tx.payment.update({
            where: { id: stk.paymentId },
            data: {
                status: PaymentStatus.PENDING,
                transactionReference: opts.receipt,
                amount,
            },
        });
    });
    await applyPaymentToLoan(stk.paymentId);
    await logAction({
        userId,
        action: "OTHER",
        entity: "MpesaStkRequest",
        entityId: stk.id,
        description: `Admin manually resolved STK request as SUCCESS with receipt ${opts.receipt}`,
        newValue: { receipt: opts.receipt, amount, reason: opts.reason },
    });
    await notifyUser(stk.loan.userId, "PAYMENT_RECEIVED", "Payment received", `We've recorded your payment of KES ${amount.toLocaleString()} for loan ${stk.loan.loanNumber}. Reference: ${opts.receipt}`, { loanId: stk.loan.id, paymentId: stk.paymentId });
    return { success: true };
}
/* ============================================================
 * MARK FAILED
 * ============================================================
 * Admin determines the payment never actually succeeded (e.g.,
 * customer says they cancelled, Safaricom has no record).
 * ============================================================ */
export async function markStkRequestFailed(userId, id, opts) {
    await checkReconAccess(userId);
    const stk = await prisma.mpesaStkRequest.findUnique({
        where: { id },
    });
    if (!stk)
        throw new Error("Not found");
    if (stk.status !== "PENDING") {
        throw new Error("Only PENDING requests can be marked failed.");
    }
    await prisma.$transaction([
        prisma.mpesaStkRequest.update({
            where: { id: stk.id },
            data: {
                status: "FAILED",
                resultDesc: opts.reason,
                reconciledAt: new Date(),
            },
        }),
        prisma.payment.update({
            where: { id: stk.paymentId },
            data: {
                status: PaymentStatus.FAILED,
                failureReason: opts.reason,
            },
        }),
    ]);
    await logAction({
        userId,
        action: "OTHER",
        entity: "MpesaStkRequest",
        entityId: stk.id,
        description: `Admin marked STK request as FAILED: ${opts.reason}`,
        newValue: { reason: opts.reason },
    });
    return { success: true };
}
/* ============================================================
 * STUCK SUMMARY — quick dashboard for the recon page
 * ============================================================ */
export async function getReconciliationSummary(userId) {
    await checkReconAccess(userId);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pendingTotal, pendingOver1Hour, pendingOver1Day, recentlyResolved] = await Promise.all([
        prisma.mpesaStkRequest.count({ where: { status: "PENDING" } }),
        prisma.mpesaStkRequest.count({
            where: { status: "PENDING", createdAt: { lt: oneHourAgo } },
        }),
        prisma.mpesaStkRequest.count({
            where: { status: "PENDING", createdAt: { lt: oneDayAgo } },
        }),
        prisma.mpesaStkRequest.count({
            where: {
                status: "SUCCESS",
                reconciledAt: { gte: oneDayAgo },
            },
        }),
    ]);
    return {
        pendingTotal,
        pendingOver1Hour,
        pendingOver1Day,
        recentlyResolved,
    };
}
//# sourceMappingURL=reconciliation.service.js.map