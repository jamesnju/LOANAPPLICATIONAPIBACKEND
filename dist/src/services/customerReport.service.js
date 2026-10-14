import { prisma } from "../config/prisma.js";
import { PaymentStatus, TransactionType } from "../generated/prisma/enums.js";
/* ============================================================
 * ACCESS
 * ============================================================
 * Customers can only pull their own data. We enforce that by
 * scoping every query with `userId` — no separate role check is
 * needed because the userId comes from the verified access token.
 * ============================================================ */
/* ============================================================
 * ACCOUNT STATEMENT
 * ============================================================
 * Every transaction across every loan the customer has, with
 * running context (which loan, what type, amount in/out).
 * ============================================================ */
export async function getCustomerAccountStatement(userId, opts) {
    const where = { userId };
    if (opts.loanId)
        where.id = opts.loanId;
    const loans = await prisma.loan.findMany({
        where,
        select: { id: true, loanNumber: true },
    });
    const loanIds = loans.map((l) => l.id);
    const loanMap = new Map(loans.map((l) => [l.id, l.loanNumber]));
    if (loanIds.length === 0) {
        return { transactions: [], summary: emptySummary(), customer: null };
    }
    const txWhere = { loanId: { in: loanIds } };
    if (opts.startDate || opts.endDate) {
        txWhere.createdAt = {};
        if (opts.startDate)
            txWhere.createdAt.gte = opts.startDate;
        if (opts.endDate)
            txWhere.createdAt.lte = opts.endDate;
    }
    const [transactions, customer] = await Promise.all([
        prisma.loanTransaction.findMany({
            where: txWhere,
            orderBy: { createdAt: "asc" },
            include: {
                payment: {
                    select: {
                        paymentReference: true,
                        paymentMethod: true,
                        transactionReference: true,
                    },
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                nationalId: true,
            },
        }),
    ]);
    /* Running totals: disbursements are money out to the customer,
     * repayments are money in from the customer. */
    let totalDisbursed = 0;
    let totalRepaid = 0;
    let totalFees = 0;
    let totalPenalties = 0;
    const enriched = transactions.map((t) => {
        const amount = Number(t.amount);
        switch (t.type) {
            case TransactionType.DISBURSEMENT:
                totalDisbursed += amount;
                break;
            case TransactionType.REPAYMENT:
                totalRepaid += amount;
                break;
            case TransactionType.FEE:
            case TransactionType.INTEREST:
                totalFees += amount;
                break;
            case TransactionType.PENALTY:
                totalPenalties += amount;
                break;
        }
        return {
            id: t.id,
            loanNumber: loanMap.get(t.loanId) ?? "—",
            type: t.type,
            amount,
            description: t.description,
            reference: t.reference,
            transactionNumber: t.transactionNumber,
            balanceBefore: Number(t.balanceBefore),
            balanceAfter: Number(t.balanceAfter),
            createdAt: t.createdAt,
            payment: t.payment
                ? {
                    reference: t.payment.paymentReference,
                    method: t.payment.paymentMethod,
                    receipt: t.payment.transactionReference,
                }
                : null,
        };
    });
    /* Compute current outstanding across all loans */
    const outstanding = await prisma.loan.aggregate({
        _sum: { outstandingAmount: true },
        where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE"] } },
    });
    return {
        customer,
        transactions: enriched,
        summary: {
            totalDisbursed,
            totalRepaid,
            totalFees,
            totalPenalties,
            currentOutstanding: Number(outstanding._sum.outstandingAmount ?? 0),
        },
    };
}
function emptySummary() {
    return {
        totalDisbursed: 0,
        totalRepaid: 0,
        totalFees: 0,
        totalPenalties: 0,
        currentOutstanding: 0,
    };
}
/* ============================================================
 * LOAN SUMMARY REPORT
 * ============================================================
 * One row per loan: principal, terms, progress, next due.
 * ============================================================ */
export async function getCustomerLoanSummary(userId) {
    const loans = await prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            loanProduct: { select: { name: true, code: true } },
            repaymentSchedules: {
                orderBy: { installmentNumber: "asc" },
                select: {
                    id: true,
                    installmentNumber: true,
                    dueDate: true,
                    totalAmount: true,
                    amountPaid: true,
                    outstandingAmount: true,
                    status: true,
                },
            },
        },
    });
    return loans.map((loan) => {
        const principal = Number(loan.principalAmount);
        const total = Number(loan.totalAmount);
        const paid = Number(loan.amountPaid);
        const outstanding = Number(loan.outstandingAmount);
        const interest = Number(loan.interestAmount);
        const fees = Number(loan.processingFee);
        const penalty = Number(loan.penaltyAmount);
        const nextDue = loan.repaymentSchedules
            .filter((s) => s.status !== "PAID")
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
        const totalPaidInstallments = loan.repaymentSchedules.filter((s) => s.status === "PAID").length;
        return {
            id: loan.id,
            loanNumber: loan.loanNumber,
            product: loan.loanProduct.name,
            status: loan.status,
            principal,
            interest,
            fees,
            penalty,
            total,
            paid,
            outstanding,
            repaymentDays: loan.repaymentDays,
            disbursedAt: loan.disbursedAt,
            maturityDate: loan.maturityDate,
            createdAt: loan.createdAt,
            paidPct: total > 0 ? (paid / total) * 100 : 0,
            scheduleProgress: {
                paidInstallments: totalPaidInstallments,
                totalInstallments: loan.repaymentSchedules.length,
            },
            nextDue: nextDue
                ? {
                    installmentNumber: nextDue.installmentNumber,
                    dueDate: nextDue.dueDate,
                    amount: Number(nextDue.totalAmount),
                    outstanding: Number(nextDue.outstandingAmount),
                    isOverdue: nextDue.status !== "PAID" &&
                        nextDue.dueDate.getTime() < Date.now(),
                    daysUntilDue: Math.ceil((nextDue.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                }
                : null,
        };
    });
}
/* ============================================================
 * PAYMENT HISTORY
 * ============================================================ */
export async function getCustomerPaymentHistory(userId, opts) {
    const where = {
        loan: { userId },
    };
    if (opts.loanId)
        where.loanId = opts.loanId;
    if (opts.startDate || opts.endDate) {
        where.createdAt = {};
        if (opts.startDate)
            where.createdAt.gte = opts.startDate;
        if (opts.endDate)
            where.createdAt.lte = opts.endDate;
    }
    const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            loan: { select: { id: true, loanNumber: true } },
        },
    });
    const completed = payments.filter((p) => p.status === PaymentStatus.COMPLETED);
    const totalPaid = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
        payments: payments.map((p) => ({
            id: p.id,
            reference: p.paymentReference,
            loanNumber: p.loan.loanNumber,
            amount: Number(p.amount),
            method: p.paymentMethod,
            status: p.status,
            receipt: p.transactionReference,
            failureReason: p.failureReason,
            processedAt: p.processedAt,
            createdAt: p.createdAt,
        })),
        summary: {
            totalPayments: payments.length,
            totalCompleted: completed.length,
            totalPaid,
        },
    };
}
//# sourceMappingURL=customerReport.service.js.map