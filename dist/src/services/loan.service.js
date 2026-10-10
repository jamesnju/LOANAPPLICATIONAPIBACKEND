import { ApplicationStatus, LoanStatus, TransactionType, Role, } from "../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { notifyUser } from "./notification.service.js";
import { logAction } from "./auditLog.service.js";
import { renderReceiptToBuffer } from "./receipt.service.js";
import { sendDisbursementReceiptEmail } from "./email.service.js";
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
/* ============================================================
 * DISBURSE LOAN
 * ============================================================
 * PENDING_DISBURSEMENT → ACTIVE
 *
 * Also flips the linked LoanApplication from APPROVED → DISBURSED
 * in the same transaction, so the admin application list
 * immediately reflects the change.
 *
 * Rejects disbursement if the application is not APPROVED — this
 * prevents a state mismatch (application REJECTED/CANCELLED while
 * its loan is being disbursed).
 * ============================================================ */
export async function disburseLoan(loanId, financeUserId, paymentMethod, transactionReference, comments) {
    /* ── 1. Load loan ────────────────────────────────────── */
    const loan = await prisma.loan.findUnique({
        where: { id: loanId },
    });
    if (!loan)
        throw new Error("Loan not found");
    if (loan.status !== LoanStatus.PENDING_DISBURSEMENT) {
        throw new Error(`Only loans pending disbursement can be disbursed. Current status: ${loan.status}`);
    }
    /* ── 2. Verify finance user ──────────────────────────── */
    const financeUser = await prisma.user.findUnique({
        where: { id: financeUserId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
        },
    });
    if (!financeUser)
        throw new Error("Finance user not found");
    if (financeUser.role !== Role.FINANCE_OFFICER &&
        financeUser.role !== Role.ADMIN &&
        financeUser.role !== Role.SUPER_ADMIN) {
        throw new Error("You are not authorized to disburse loans");
    }
    /* ── 3. Pre-check: source application must be APPROVED ─ */
    const application = await prisma.loanApplication.findUnique({
        where: { id: loan.applicationId },
        select: { id: true, status: true, applicationNumber: true },
    });
    if (!application) {
        throw new Error("Source application not found");
    }
    if (application.status !== ApplicationStatus.APPROVED) {
        throw new Error(`Cannot disburse: source application ${application.applicationNumber} ` +
            `is ${application.status}, expected APPROVED.`);
    }
    /* ── 4. Dates ────────────────────────────────────────── */
    const disbursedAt = new Date();
    const maturityDate = new Date(disbursedAt);
    maturityDate.setDate(maturityDate.getDate() + loan.repaymentDays);
    /* ── 5. Atomic transaction ───────────────────────────── */
    const result = await prisma.$transaction(async (tx) => {
        /* 5a. Flip the loan to ACTIVE and stamp the dates. */
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
        /* 5b. Flip the source application to DISBURSED.
         *
         *     We already validated status === APPROVED above, so a
         *     plain update is safe here. If you'd rather be defensive
         *     against a concurrent status change between the
         *     pre-check and this write, use updateMany with a status
         *     filter and check the returned count.
         */
        await tx.loanApplication.update({
            where: { id: loan.applicationId },
            data: { status: ApplicationStatus.DISBURSED },
        });
        /* 5c. Financial ledger entry. */
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
        return { loan: updatedLoan, transaction };
    });
    /* ── 6. Post-commit side effects ─────────────────────── */
    /* None of these can roll back the disbursement. All are
     * fire-and-forget — the HTTP response returns immediately
     * after the transaction commits. */
    /* 6a. Audit log. */
    logAction({
        userId: financeUserId,
        action: "DISBURSE",
        entity: "Loan",
        entityId: loanId,
        description: `Loan ${result.loan.loanNumber} disbursed via ${paymentMethod}`,
        newValue: {
            loanStatus: "ACTIVE",
            applicationStatus: "DISBURSED",
            disbursedAt,
            transactionReference: transactionReference ?? null,
            paymentMethod,
        },
    }).catch((err) => console.error("[disburseLoan] audit log failed:", err));
    /* 6b. In-app notification to the customer. */
    notifyUser(result.loan.userId, "LOAN_DISBURSED", "Loan disbursed", `Your loan ${result.loan.loanNumber} of KES ${Number(result.loan.totalAmount).toLocaleString()} has been disbursed.`, {
        loanId: result.loan.id,
        loanNumber: result.loan.loanNumber,
        applicationId: loan.applicationId,
    }).catch((err) => console.error("[disburseLoan] notification failed:", err));
    /* 6c. Receipt email with attached PDF. Generated in memory,
     *     never stored. */
    void (async () => {
        try {
            const pdf = await renderReceiptToBuffer({
                loan: {
                    ...result.loan,
                    loanProduct: result.loan.loanProduct ?? null,
                },
                customer: {
                    id: result.loan.user.id,
                    firstName: result.loan.user.firstName,
                    lastName: result.loan.user.lastName,
                    email: result.loan.user.email,
                    phone: result.loan.user.phone ?? null,
                    nationalId: null,
                },
                disbursedBy: {
                    firstName: financeUser.firstName,
                    lastName: financeUser.lastName,
                    email: financeUser.email,
                },
                transaction: {
                    transactionNumber: result.transaction.transactionNumber,
                    reference: result.transaction.reference,
                    description: result.transaction.description,
                    createdAt: result.transaction.createdAt,
                },
                company: {
                    name: "PesaMaishaCapital",
                    phone: "+254 700 747 874",
                    email: "support@pesamaishacapital.co.ke",
                },
            });
            await sendDisbursementReceiptEmail({
                to: result.loan.user.email,
                firstName: result.loan.user.firstName,
                loanNumber: result.loan.loanNumber,
                totalAmount: Number(result.loan.totalAmount),
                pdf,
            });
        }
        catch (err) {
            console.error("[disburseLoan] receipt email failed:", err);
        }
    })();
    /* ── 7. Return ───────────────────────────────────────── */
    return result;
}
// export async function disburseLoan(
//   loanId: string,
//   financeUserId: string,
//   paymentMethod: PaymentMethod,
//   transactionReference?: string,
//   comments?: string,
// ) {
//   /* ------------------------------------------------------------
//    * 1. Load the loan and the finance user.
//    * ------------------------------------------------------------ */
//   const loan = await prisma.loan.findUnique({
//     where: { id: loanId },
//   });
//   if (!loan) throw new Error("Loan not found");
//   if (loan.status !== LoanStatus.PENDING_DISBURSEMENT) {
//     throw new Error(
//       `Only loans pending disbursement can be disbursed. Current status: ${loan.status}`,
//     );
//   }
//   const financeUser = await prisma.user.findUnique({
//     where: { id: financeUserId },
//     select: {
//       id: true,
//       firstName: true,
//       lastName: true,
//       email: true,
//       role: true,
//     },
//   });
//   if (!financeUser) throw new Error("Finance user not found");
//   if (
//     financeUser.role !== Role.FINANCE_OFFICER &&
//     financeUser.role !== Role.ADMIN &&
//     financeUser.role !== Role.SUPER_ADMIN
//   ) {
//     throw new Error("You are not authorized to disburse loans");
//   }
//   /* ------------------------------------------------------------
//    * 2. Compute dates.
//    * ------------------------------------------------------------ */
//   const disbursedAt = new Date();
//   const maturityDate = new Date(disbursedAt);
//   maturityDate.setDate(maturityDate.getDate() + loan.repaymentDays);
//   /* ------------------------------------------------------------
//    * 3. Atomic transaction — ONLY the DB writes go here.
//    *
//    *    Audit logging, notifications and email happen AFTER the
//    *    transaction commits. Previously they were called inside
//    *    the callback using the global `prisma` client, which meant
//    *    a later rollback would leave a "Loan disbursed" audit
//    *    entry and notification for a loan that never actually
//    *    disbursed.
//    * ------------------------------------------------------------ */
//   const result = await prisma.$transaction(async (tx) => {
//     const updatedLoan = await tx.loan.update({
//       where: { id: loanId },
//       data: {
//         status: LoanStatus.ACTIVE,
//         disbursedAt,
//         maturityDate,
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             phone: true,
//           },
//         },
//         loanProduct: true,
//         application: true,
//       },
//     });
//     const transaction = await tx.loanTransaction.create({
//       data: {
//         transactionNumber: generateTransactionNumber(),
//         loanId,
//         type: TransactionType.DISBURSEMENT,
//         amount: loan.principalAmount,
//         description: comments ?? "Loan disbursed successfully",
//         reference: transactionReference ?? null,
//         balanceBefore: 0,
//         balanceAfter: loan.outstandingAmount,
//       },
//     });
//     return { loan: updatedLoan, transaction };
//   });
//   /* ------------------------------------------------------------
//    * 4. Post-commit side effects.
//    *
//    *    None of these can roll back the disbursement, and none of
//    *    them should block the HTTP response — the finance officer's
//    *    UI returns as soon as the transaction commits. Failures
//    *    are logged but never surfaced as a disbursement failure.
//    * ------------------------------------------------------------ */
//   /* 4a. Audit log. */
//   logAction({
//     userId: financeUserId,
//     action: "DISBURSE",
//     entity: "Loan",
//     entityId: loanId,
//     description: `Loan disbursed via ${paymentMethod}`,
//     newValue: {
//       status: "ACTIVE",
//       disbursedAt,
//       transactionReference: transactionReference ?? null,
//     },
//   }).catch((err) => console.error("[disburseLoan] audit log failed:", err));
//   /* 4b. In-app notification. */
//   notifyUser(
//     result.loan.userId,
//     "LOAN_DISBURSED",
//     "Loan disbursed",
//     `Your loan ${result.loan.loanNumber} of KES ${Number(
//       result.loan.totalAmount,
//     ).toLocaleString()} has been disbursed.`,
//     {
//       loanId: result.loan.id,
//       loanNumber: result.loan.loanNumber,
//     },
//   ).catch((err) =>
//     console.error("[disburseLoan] notification failed:", err),
//   );
//   /* 4c. Receipt email — generate PDF in memory and send.
//    *     No storage; regenerated on demand if the user asks again. */
//   (async () => {
//     try {
//       const pdf = await renderReceiptToBuffer({
//         loan: {
//           ...result.loan,
//           loanProduct: result.loan.loanProduct ?? null,
//         },
//         customer: {
//           id: result.loan.user.id,
//           firstName: result.loan.user.firstName,
//           lastName: result.loan.user.lastName,
//           email: result.loan.user.email,
//           phone: result.loan.user.phone ?? null,
//           nationalId: null, // not selected on the loan.user include; see note below
//         },
//         disbursedBy: {
//           firstName: financeUser.firstName,
//           lastName: financeUser.lastName,
//           email: financeUser.email,
//         },
//         transaction: {
//           transactionNumber: result.transaction.transactionNumber,
//           reference: result.transaction.reference,
//           description: result.transaction.description,
//           createdAt: result.transaction.createdAt,
//         },
//         company: {
//           name: "PesaMaishaCapital",
//           phone: "+254 700 747 874",
//           email: "support@pesamaishacapital.co.ke",
//         },
//       });
//       await sendDisbursementReceiptEmail({
//         to: result.loan.user.email,
//         firstName: result.loan.user.firstName,
//         loanNumber: result.loan.loanNumber,
//         totalAmount: Number(result.loan.totalAmount),
//         pdf,
//       });
//     } catch (err) {
//       console.error("[disburseLoan] receipt email failed:", err);
//     }
//   })();
//   /* ------------------------------------------------------------
//    * 5. Return — same shape as before, so callers don't change.
//    * ------------------------------------------------------------ */
//   return result;
// }
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