import { ApplicationStatus, LoanStatus, TransactionType, Role, } from "../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { notifyUser } from "./notification.service.js";
import { logAction } from "./auditLog.service.js";
/*
 * ============================================================
 * HELPERS
 * ============================================================
 */
/*
 * Generate a human-readable loan number.
 *
 * Example:
 *
 * LN-20260928-8F4K2P
 */
function generateLoanNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LN-${year}${month}${day}-${randomPart}`;
}
/*
 * Generate transaction number.
 *
 * Example:
 *
 * TXN-20260928-AB12CD
 */
function generateTransactionNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${year}${month}${day}-${randomPart}`;
}
/*
 * ============================================================
 * CREATE LOAN FROM APPROVED APPLICATION
 * ============================================================
 *
 * Application:
 *
 * APPROVED
 *     ↓
 * Loan:
 *
 * PENDING_DISBURSEMENT
 *
 * IMPORTANT:
 *
 * We copy the approved application's financial values into
 * the Loan table.
 *
 * This means that if the Loan Product changes later,
 * the existing loan does NOT change.
 */
export async function createLoanFromApplication(applicationId, createdByUserId) {
    /*
     * Find the application.
     */
    const application = await prisma.loanApplication.findUnique({
        where: {
            id: applicationId,
        },
        include: {
            loanProduct: true,
            user: true,
            loan: true,
        },
    });
    if (!application) {
        throw new Error("Loan application not found");
    }
    /*
     * Only APPROVED applications can become loans.
     */
    if (application.status !== ApplicationStatus.APPROVED) {
        throw new Error(`Only approved applications can be converted into loans. Current status: ${application.status}`);
    }
    /*
     * Prevent duplicate loan creation.
     */
    if (application.loan) {
        throw new Error("A loan has already been created for this application");
    }
    /*
     * Verify the user creating the loan.
     */
    const creator = await prisma.user.findUnique({
        where: {
            id: createdByUserId,
        },
    });
    if (!creator) {
        throw new Error("User creating the loan was not found");
    }
    /*
     * Loan creation should normally be performed by
     * Finance, Admin or Super Admin.
     */
    if (creator.role !== Role.FINANCE_OFFICER &&
        creator.role !== Role.ADMIN &&
        creator.role !== Role.SUPER_ADMIN) {
        throw new Error("You are not authorized to create loans");
    }
    /*
     * ==========================================================
     * FINANCIAL CALCULATIONS
     * ==========================================================
     *
     * Example:
     *
     * Principal = 3,000
     * Interest rate = 5%
     * Processing fee = 100
     *
     * Interest:
     *
     * 3000 × 5 / 100 = 150
     *
     * Total:
     *
     * 3000 + 150 + 100 = 3,250
     */
    const principalAmount = Number(application.requestedAmount);
    const interestRate = Number(application.interestRate);
    const processingFee = Number(application.processingFee);
    const interestAmount = (principalAmount * interestRate) / 100;
    const totalAmount = principalAmount + interestAmount + processingFee;
    const outstandingAmount = totalAmount;
    /*
     * Generate unique loan number.
     *
     * Very unlikely to collide, but we also check the database.
     */
    let loanNumber = generateLoanNumber();
    while (await prisma.loan.findUnique({
        where: {
            loanNumber,
        },
    })) {
        loanNumber = generateLoanNumber();
    }
    /*
     * Create the loan.
     */
    const loan = await prisma.loan.create({
        data: {
            loanNumber,
            applicationId: application.id,
            userId: application.userId,
            loanProductId: application.loanProductId,
            principalAmount,
            interestRate,
            interestAmount,
            processingFee,
            penaltyAmount: 0,
            totalAmount,
            amountPaid: 0,
            outstandingAmount,
            repaymentDays: application.requestedDays,
            status: LoanStatus.PENDING_DISBURSEMENT,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                },
            },
            loanProduct: true,
            application: true,
        },
    });
    // after creating the loan:
    await logAction({
        userId: createdByUserId,
        action: "CREATE",
        entity: "Loan",
        entityId: loan.id,
        description: `Loan ${loan.loanNumber} created from application`,
        newValue: {
            loanNumber: loan.loanNumber,
            principalAmount: loan.principalAmount.toString(),
            status: loan.status,
        },
    });
    await notifyUser(loan.userId, "APPLICATION_APPROVED", // reuse — or add a new type if you want
    "Loan created", `Your loan ${loan.loanNumber} has been created and is pending disbursement.`, {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
    });
    return loan;
}
/*
 * ============================================================
 * GET LOAN BY ID
 * ============================================================
 */
export async function getLoanById(loanId, requestingUserId) {
    const loan = await prisma.loan.findUnique({
        where: {
            id: loanId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
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
                orderBy: {
                    installmentNumber: "asc",
                },
            },
        },
    });
    if (!loan) {
        throw new Error("Loan not found");
    }
    /*
     * Verify requester.
     *
     * Staff can access the loan.
     *
     * Customers can only access their own loan.
     */
    const requester = await prisma.user.findUnique({
        where: {
            id: requestingUserId,
        },
    });
    if (!requester) {
        throw new Error("User not found");
    }
    const isStaff = requester.role === Role.SUPER_ADMIN ||
        requester.role === Role.ADMIN ||
        requester.role === Role.LOAN_OFFICER ||
        requester.role === Role.FINANCE_OFFICER ||
        requester.role === Role.SUPPORT;
    if (!isStaff && loan.userId !== requestingUserId) {
        throw new Error("You are not authorized to view this loan");
    }
    return loan;
}
/*
 * ============================================================
 * GET MY LOANS
 * ============================================================
 */
export async function getMyLoans(userId) {
    const loans = await prisma.loan.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
        include: {
            loanProduct: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
            application: {
                select: {
                    id: true,
                    applicationNumber: true,
                    purpose: true,
                    status: true,
                },
            },
        },
    });
    return loans;
}
/*
 * ============================================================
 * DISBURSE LOAN
 * ============================================================
 *
 * PENDING_DISBURSEMENT
 *          ↓
 *       ACTIVE
 *
 * The repayment schedule is NOT generated here.
 *
 * That belongs to the next module.
 */
export async function disburseLoan(loanId, financeUserId, paymentMethod, transactionReference, comments) {
    /*
     * Get loan.
     */
    const loan = await prisma.loan.findUnique({
        where: {
            id: loanId,
        },
    });
    if (!loan) {
        throw new Error("Loan not found");
    }
    /*
     * Loan must be waiting for disbursement.
     */
    if (loan.status !== LoanStatus.PENDING_DISBURSEMENT) {
        throw new Error(`Only loans pending disbursement can be disbursed. Current status: ${loan.status}`);
    }
    /*
     * Verify finance user.
     */
    const financeUser = await prisma.user.findUnique({
        where: {
            id: financeUserId,
        },
    });
    if (!financeUser) {
        throw new Error("Finance user not found");
    }
    if (financeUser.role !== Role.FINANCE_OFFICER &&
        financeUser.role !== Role.ADMIN &&
        financeUser.role !== Role.SUPER_ADMIN) {
        throw new Error("You are not authorized to disburse loans");
    }
    /*
     * Disbursement date.
     */
    const disbursedAt = new Date();
    /*
     * Calculate maturity date.
     *
     * Example:
     *
     * disbursedAt = 28 Sept
     * repaymentDays = 30
     *
     * maturityDate = 28 Oct
     */
    const maturityDate = new Date(disbursedAt);
    maturityDate.setDate(maturityDate.getDate() + loan.repaymentDays);
    /*
     * ==========================================================
     * TRANSACTION
     * ==========================================================
     *
     * Loan status and financial transaction must be changed
     * together.
     */
    const result = await prisma.$transaction(async (tx) => {
        const updatedLoan = await tx.loan.update({
            where: { id: loanId },
            data: {
                status: LoanStatus.ACTIVE,
                disbursedAt,
                maturityDate,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                loanProduct: true,
                application: true,
            },
        });
        const transaction = await tx.loanTransaction.create({
            data: {
                transactionNumber: generateTransactionNumber(),
                loanId,
                type: TransactionType.DISBURSEMENT,
                amount: loan.principalAmount,
                description: comments ?? "Loan disbursed successfully",
                reference: transactionReference ?? null,
                balanceBefore: 0,
                balanceAfter: loan.outstandingAmount,
            },
        });
        await logAction({
            userId: financeUserId,
            action: "DISBURSE",
            entity: "Loan",
            entityId: loanId,
            description: `Loan disbursed via ${paymentMethod}`,
            newValue: {
                status: "ACTIVE",
                disbursedAt,
                transactionReference: transactionReference ?? null,
            },
        });
        await notifyUser(updatedLoan.userId, // ✅ fixed
        "LOAN_DISBURSED", "Loan disbursed", `Your loan ${updatedLoan.loanNumber} of KES ${Number(updatedLoan.totalAmount).toLocaleString()} has been disbursed.`, {
            loanId: updatedLoan.id, // ✅ fixed
            loanNumber: updatedLoan.loanNumber, // ✅ fixed
        });
        return {
            loan: updatedLoan,
            transaction,
        };
    });
    return result;
}
/*
 * ============================================================
 * GET LOAN TRANSACTIONS
 * ============================================================
 */
export async function getLoanTransactions(loanId, requestingUserId) {
    /*
     * First verify access to the loan.
     */
    await getLoanById(loanId, requestingUserId);
    const transactions = await prisma.loanTransaction.findMany({
        where: {
            loanId,
        },
        orderBy: {
            createdAt: "asc",
        },
        include: {
            payment: {
                select: {
                    id: true,
                    paymentReference: true,
                    amount: true,
                    paymentMethod: true,
                    transactionReference: true,
                    status: true,
                },
            },
        },
    });
    return transactions;
}
export async function getAdminLoans(query) {
    const { status, page, limit } = query;
    const where = {
        ...(status && { status }),
    };
    const [items, total] = await prisma.$transaction([
        prisma.loan.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                loanProduct: { select: { id: true, name: true, code: true } },
                application: {
                    select: {
                        id: true,
                        applicationNumber: true,
                        purpose: true,
                        status: true,
                    },
                },
            },
        }),
        prisma.loan.count({ where }),
    ]);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
//# sourceMappingURL=loan.service.js.map