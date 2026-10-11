import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { LoanStatus, PaymentMethod, PaymentStatus, RepaymentStatus, TransactionType, } from "../generated/prisma/client.js";
import { initiateStkPush, normalisePhone, queryStkStatus, } from "./mpesa.service.js";
import { logAction } from "./auditLog.service.js";
import { notifyUser } from "./notification.service.js";
/* ============================================================
 * HELPERS
 * ============================================================ */
function generatePaymentReference() {
    const date = new Date();
    const ymd = date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${ymd}-${rand}`;
}
function generateTransactionNumber() {
    const date = new Date();
    const ymd = date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${ymd}-${rand}`;
}
/* ============================================================
 * INITIATE STK PUSH
 * ============================================================
 * 1. Validate the loan belongs to the caller and is repayable.
 * 2. Create a Payment in PENDING.
 * 3. Create an MpesaStkRequest in PENDING.
 * 4. Call Safaricom.
 * 5. Update the MpesaStkRequest with Safaricom's response ids.
 * ============================================================ */
export async function initiateLoanRepayment(customerId, input) {
    const { loanId, amount, phone } = input;
    /* ── 1. Loan must belong to the caller and be repayable ── */
    const loan = await prisma.loan.findFirst({
        where: { id: loanId, userId: customerId },
        select: {
            id: true,
            loanNumber: true,
            status: true,
            outstandingAmount: true,
            userId: true,
        },
    });
    if (!loan)
        throw new Error("Loan not found");
    const allowedStatuses = [
        LoanStatus.ACTIVE,
        LoanStatus.PARTIALLY_PAID,
        LoanStatus.OVERDUE,
    ];
    if (!allowedStatuses.includes(loan.status)) {
        throw new Error(`This loan cannot receive payments (status: ${loan.status}).`);
    }
    /* ── 2. Amount must not exceed the outstanding balance ── */
    const outstanding = Number(loan.outstandingAmount);
    if (amount > outstanding + 0.01) {
        /* Small tolerance to allow "pay exactly the outstanding" without
         * rounding complaints. 1 cent. */
        throw new Error(`Amount exceeds outstanding balance of KES ${outstanding.toLocaleString()}.`);
    }
    const normalisedPhone = normalisePhone(phone);
    /* ── 3. Create Payment + StkRequest atomically ── */
    const merchantRequestId = `MR-${randomUUID()}`;
    const paymentReference = generatePaymentReference();
    const { payment, stkRequest } = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
            data: {
                paymentReference,
                loanId,
                amount,
                paymentMethod: PaymentMethod.MPESA,
                status: PaymentStatus.PENDING,
            },
        });
        const stkRequest = await tx.mpesaStkRequest.create({
            data: {
                merchantRequestId,
                paymentId: payment.id,
                loanId,
                phone: normalisedPhone,
                amount,
                accountReference: loan.loanNumber,
                requestBody: {},
                status: "PENDING",
            },
        });
        return { payment, stkRequest };
    });
    /* ── 4. Call Safaricom ── */
    try {
        const response = await initiateStkPush({
            phone: normalisedPhone,
            amount,
            accountReference: loan.loanNumber,
            transactionDesc: "Loan repayment",
        });
        /* ── 5. Store Safaricom's ids ── */
        await prisma.mpesaStkRequest.update({
            where: { id: stkRequest.id },
            data: {
                checkoutRequestId: response.CheckoutRequestID,
                requestBody: response,
            },
        });
        await logAction({
            userId: customerId,
            action: "CREATE",
            entity: "Payment",
            entityId: payment.id,
            description: `STK Push initiated for loan ${loan.loanNumber}`,
            newValue: {
                amount,
                phone: normalisedPhone,
                checkoutRequestId: response.CheckoutRequestID,
            },
        });
        return {
            paymentId: payment.id,
            checkoutRequestId: response.CheckoutRequestID,
            customerMessage: response.CustomerMessage,
        };
    }
    catch (err) {
        /* Safaricom rejected the request — mark both rows failed so
         * the UI knows this attempt is dead. */
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.FAILED,
                    failureReason: err instanceof Error ? err.message : "STK Push request failed",
                },
            }),
            prisma.mpesaStkRequest.update({
                where: { id: stkRequest.id },
                data: {
                    status: "FAILED",
                    resultDesc: err instanceof Error ? err.message : "STK Push request failed",
                },
            }),
        ]);
        throw err;
    }
}
/* ============================================================
 * APPLY PAYMENT TO LOAN
 * ============================================================
 * Called after a payment reaches COMPLETED (via STK callback or
 * via admin manual entry).
 *
 * This is the atomic financial core: allocate the payment across
 * the repayment schedule, update the loan's amountPaid and
 * outstandingAmount, insert a LoanTransaction, and flip the loan
 * status if it's now FULLY_PAID or PARTIALLY_PAID.
 *
 * Idempotency: the caller must pass a `paymentId`. If the
 * Payment row's status is already COMPLETED, we return early.
 * This lets callbacks be delivered more than once safely.
 * ============================================================ */
export async function applyPaymentToLoan(paymentId) {
    return prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { loan: true },
        });
        if (!payment)
            throw new Error("Payment not found");
        if (payment.status === PaymentStatus.COMPLETED) {
            /* Already applied — nothing to do. */
            return { payment, alreadyApplied: true };
        }
        const loan = payment.loan;
        const amount = Number(payment.amount);
        const previousPaid = Number(loan.amountPaid);
        const previousOutstanding = Number(loan.outstandingAmount);
        const newPaid = previousPaid + amount;
        const newOutstanding = Math.max(0, previousOutstanding - amount);
        /* ── Allocate across the schedule ── */
        const schedule = await tx.repaymentSchedule.findMany({
            where: { loanId: loan.id, status: { not: RepaymentStatus.PAID } },
            orderBy: { installmentNumber: "asc" },
        });
        let remaining = amount;
        for (const item of schedule) {
            if (remaining <= 0)
                break;
            const itemOutstanding = Number(item.outstandingAmount) || Number(item.totalAmount);
            const applied = Math.min(remaining, itemOutstanding);
            const newItemPaid = Number(item.amountPaid) + applied;
            const newItemOutstanding = Number(item.totalAmount) - newItemPaid;
            const itemFullyPaid = newItemOutstanding <= 0.01;
            await tx.repaymentSchedule.update({
                where: { id: item.id },
                data: {
                    amountPaid: newItemPaid,
                    outstandingAmount: Math.max(0, newItemOutstanding),
                    status: itemFullyPaid
                        ? RepaymentStatus.PAID
                        : RepaymentStatus.PARTIALLY_PAID,
                    paidAt: itemFullyPaid ? new Date() : item.paidAt,
                },
            });
            remaining -= applied;
        }
        /* ── Loan status transition ── */
        let newLoanStatus = loan.status;
        if (newOutstanding <= 0.01) {
            newLoanStatus = LoanStatus.FULLY_PAID;
        }
        else if (newPaid > 0) {
            newLoanStatus = LoanStatus.PARTIALLY_PAID;
        }
        /* ── Update the loan ── */
        const updatedLoan = await tx.loan.update({
            where: { id: loan.id },
            data: {
                amountPaid: newPaid,
                outstandingAmount: newOutstanding,
                status: newLoanStatus,
            },
        });
        /* ── Mark the payment completed ── */
        const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.COMPLETED,
                paymentDate: new Date(),
                processedAt: new Date(),
            },
        });
        /* ── Ledger entry ── */
        await tx.loanTransaction.create({
            data: {
                transactionNumber: generateTransactionNumber(),
                loanId: loan.id,
                paymentId: payment.id,
                type: TransactionType.REPAYMENT,
                amount,
                description: `Repayment via ${payment.paymentMethod}`,
                reference: payment.transactionReference ?? null,
                balanceBefore: previousOutstanding,
                balanceAfter: newOutstanding,
            },
        });
        return {
            payment: updatedPayment,
            loan: updatedLoan,
            previousPaid,
            newPaid,
            previousOutstanding,
            newOutstanding,
            alreadyApplied: false,
        };
    });
}
export async function handleStkCallback(body) {
    const cb = body.Body.stkCallback;
    /* ── 1. Look up the request, plus its payment and loan ──
     * Fetch the loan eagerly here so we have `userId` available
     * on both the failure and success paths. */
    const stk = await prisma.mpesaStkRequest.findUnique({
        where: { checkoutRequestId: cb.CheckoutRequestID },
        include: {
            payment: true,
            loan: {
                select: {
                    id: true,
                    loanNumber: true,
                    userId: true,
                    outstandingAmount: true,
                },
            },
        },
    });
    if (!stk) {
        console.warn("[handleStkCallback] unknown CheckoutRequestID:", cb.CheckoutRequestID);
        return { handled: false };
    }
    /* ── 2. Idempotency guard ── */
    if (stk.callbackReceivedAt) {
        return { handled: true, alreadyProcessed: true };
    }
    /* ── 3. Persist the raw callback ── */
    await prisma.mpesaStkRequest.update({
        where: { id: stk.id },
        data: {
            callbackBody: body,
            callbackReceivedAt: new Date(),
            resultCode: cb.ResultCode,
            resultDesc: cb.ResultDesc,
        },
    });
    /* ── 4. Failure path (ResultCode !== 0) ── */
    if (cb.ResultCode !== 0) {
        await prisma.$transaction([
            prisma.mpesaStkRequest.update({
                where: { id: stk.id },
                data: { status: "FAILED", reconciledAt: new Date() },
            }),
            prisma.payment.update({
                where: { id: stk.paymentId },
                data: {
                    status: PaymentStatus.FAILED,
                    failureReason: cb.ResultDesc,
                },
            }),
        ]);
        await logAction({
            /* ↓ correct source: the loan's owner */
            userId: stk.loan.userId,
            action: "REPAY",
            entity: "Payment",
            entityId: stk.paymentId,
            description: `STK Push failed: ${cb.ResultDesc}`,
            newValue: {
                resultCode: cb.ResultCode,
                checkoutRequestId: cb.CheckoutRequestID,
            },
        });
        return { handled: true, success: false, reason: cb.ResultDesc };
    }
    /* ── 5. Success: extract metadata ── */
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value ??
        null;
    const paidAmount = Number(items.find((i) => i.Name === "Amount")?.Value ?? stk.amount);
    if (Math.abs(paidAmount - Number(stk.amount)) > 0.01) {
        console.error("[handleStkCallback] amount mismatch:", {
            paidAmount,
            expected: stk.amount,
            checkoutRequestId: cb.CheckoutRequestID,
        });
    }
    /* ── 6. Persist success + attach receipt to the Payment ── */
    await prisma.$transaction([
        prisma.mpesaStkRequest.update({
            where: { id: stk.id },
            data: { status: "SUCCESS", reconciledAt: new Date() },
        }),
        prisma.payment.update({
            where: { id: stk.paymentId },
            data: { transactionReference: receipt },
        }),
    ]);
    /* ── 7. Apply the payment to the loan (idempotent) ── */
    await applyPaymentToLoan(stk.paymentId);
    /* ── 8. Notify the customer ── */
    await notifyUser(stk.loan.userId, "PAYMENT_RECEIVED", "Payment received", `We've received KES ${Number(stk.amount).toLocaleString()} for loan ${stk.loan.loanNumber}. Outstanding balance: KES ${Number(stk.loan.outstandingAmount).toLocaleString()}.`, {
        loanId: stk.loan.id,
        loanNumber: stk.loan.loanNumber,
        paymentId: stk.paymentId,
    });
    /* ── 9. Audit log ── */
    await logAction({
        userId: stk.loan.userId,
        action: "REPAY",
        entity: "Payment",
        entityId: stk.paymentId,
        description: `STK Push succeeded — receipt ${receipt ?? "—"}`,
        newValue: {
            checkoutRequestId: cb.CheckoutRequestID,
            receipt,
            amount: paidAmount,
        },
    });
    return { handled: true, success: true, receipt };
}
/* ============================================================
 * RECONCILE STUCK REQUESTS
 * ============================================================
 * For STK Push requests older than N minutes that never got a
 * callback (Safaricom outage, dropped delivery), query the
 * status endpoint directly.
 *
 * Run this from a cron job every 2–5 minutes.
 * ============================================================ */
export async function reconcilePendingStkRequests() {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 min
    const stuck = await prisma.mpesaStkRequest.findMany({
        where: {
            status: "PENDING",
            createdAt: { lt: cutoff },
            checkoutRequestId: { not: null },
            callbackReceivedAt: null,
        },
        take: 50,
        orderBy: { createdAt: "asc" },
    });
    let reconciled = 0;
    for (const req of stuck) {
        try {
            const result = await queryStkStatus(req.checkoutRequestId);
            /* 1032 = "cancelled by user". 1037 = "timeout".
             * 0 = success. Anything else is a failure. */
            const resultCode = Number(result.ResultCode);
            if (resultCode === 0) {
                /* Success without callback. Fabricate a minimal callback
                 * and pass through the same handler so all the
                 * downstream bookkeeping is reused. */
                await handleStkCallback({
                    Body: {
                        stkCallback: {
                            MerchantRequestID: req.merchantRequestId,
                            CheckoutRequestID: req.checkoutRequestId,
                            ResultCode: 0,
                            ResultDesc: result.ResultDesc,
                        },
                    },
                });
            }
            else {
                await prisma.mpesaStkRequest.update({
                    where: { id: req.id },
                    data: {
                        status: resultCode === 1032
                            ? "CANCELLED"
                            : resultCode === 1037
                                ? "TIMEOUT"
                                : "FAILED",
                        resultCode,
                        resultDesc: result.ResultDesc,
                        reconciledAt: new Date(),
                    },
                });
                await prisma.payment.update({
                    where: { id: req.paymentId },
                    data: {
                        status: resultCode === 1032
                            ? PaymentStatus.CANCELLED
                            : PaymentStatus.FAILED,
                        failureReason: result.ResultDesc,
                    },
                });
            }
            reconciled++;
        }
        catch (err) {
            console.error("[reconcilePendingStkRequests] failed for", req.checkoutRequestId, err);
        }
    }
    return { checked: stuck.length, reconciled };
}
//# sourceMappingURL=payment.service.js.map