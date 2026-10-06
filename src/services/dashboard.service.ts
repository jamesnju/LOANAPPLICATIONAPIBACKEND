// backend/src/services/dashboard.service.ts
import { prisma } from "../config/prisma.js";
import {
  LoanStatus,
  ApplicationStatus,
  KycStatus,
  PaymentStatus,
} from "../generated/prisma/client.js";

/* ============================================================
 * HELPERS
 * ==========================================================*/

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.ceil((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/* ============================================================
 * CUSTOMER DASHBOARD
 * ============================================================
 * Single call returns everything the customer dashboard needs:
 *  - greeting/user info
 *  - KYC status
 *  - active loan summary + next due + countdown
 *  - loan history summary
 *  - recent payments (last 5)
 *  - recent transactions (last 5)
 *  - pending applications
 *  - unread notifications count
 * ==========================================================*/
export async function getCustomerDashboard(userId: string) {
  /* -------------------------------
   * 1. User + KYC snapshot
   * ----------------------------- */
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      emailVerified: true,
      phoneVerified: true,
      kyc: {
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  /* -------------------------------
   * 2. Active loans (all non-terminal statuses)
   * ----------------------------- */
  const activeStatuses: LoanStatus[] = [
    LoanStatus.PENDING_DISBURSEMENT,
    LoanStatus.ACTIVE,
    LoanStatus.PARTIALLY_PAID,
    LoanStatus.OVERDUE,
    LoanStatus.DEFAULTED,
  ];

  const activeLoans = await prisma.loan.findMany({
    where: { userId, status: { in: activeStatuses } },
    orderBy: { createdAt: "desc" },
    include: {
      loanProduct: { select: { id: true, name: true, code: true } },
      repaymentSchedules: {
        where: { status: { not: "PAID" } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
  });

  const now = new Date();

  const activeLoansSummary = activeLoans.map((loan) => {
    const nextSchedule = loan.repaymentSchedules[0] ?? null;

    const daysUntilDue = nextSchedule
      ? daysBetween(nextSchedule.dueDate, now)
      : null;

    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

    return {
      id: loan.id,
      loanNumber: loan.loanNumber,
      productName: loan.loanProduct?.name ?? "Loan",
      status: loan.status,
      principalAmount: Number(loan.principalAmount),
      totalAmount: Number(loan.totalAmount),
      amountPaid: Number(loan.amountPaid),
      outstandingAmount: Number(loan.outstandingAmount),
      repaymentDays: loan.repaymentDays,
      disbursedAt: loan.disbursedAt,
      maturityDate: loan.maturityDate,
      nextDue: nextSchedule
        ? {
            installmentNumber: nextSchedule.installmentNumber,
            dueDate: nextSchedule.dueDate,
            amount: Number(nextSchedule.totalAmount),
            outstanding: Number(nextSchedule.outstandingAmount),
            daysUntilDue,
            isOverdue,
          }
        : null,
    };
  });

  /* -------------------------------
   * 3. Aggregate totals across active loans
   * ----------------------------- */
  const totalOutstanding = activeLoansSummary.reduce(
    (sum, l) => sum + l.outstandingAmount,
    0
  );
  const totalPaidToDate = activeLoansSummary.reduce(
    (sum, l) => sum + l.amountPaid,
    0
  );
  const totalBorrowed = activeLoansSummary.reduce(
    (sum, l) => sum + l.totalAmount,
    0
  );

  /* -------------------------------
   * 4. Next payment (soonest upcoming across active loans)
   * ----------------------------- */
  const upcomingSchedules = activeLoans
    .map((l) => l.repaymentSchedules[0])
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const nextPayment = upcomingSchedules[0]
    ? {
        loanId: activeLoans.find((l) =>
          l.repaymentSchedules.some((s) => s.id === upcomingSchedules[0].id)
        )?.id,
        installmentNumber: upcomingSchedules[0].installmentNumber,
        dueDate: upcomingSchedules[0].dueDate,
        amount: Number(upcomingSchedules[0].totalAmount),
        outstanding: Number(upcomingSchedules[0].outstandingAmount),
        daysUntilDue: daysBetween(upcomingSchedules[0].dueDate, now),
      }
    : null;

  /* -------------------------------
   * 5. Total completed/closed loans count
   * ----------------------------- */
  const completedLoansCount = await prisma.loan.count({
    where: {
      userId,
      status: { in: [LoanStatus.FULLY_PAID, LoanStatus.WRITTEN_OFF] },
    },
  });

  const overdueCount = activeLoans.filter(
    (l) => l.status === LoanStatus.OVERDUE || l.status === LoanStatus.DEFAULTED
  ).length;

  /* -------------------------------
   * 6. Pending applications
   * ----------------------------- */
  const pendingApplications = await prisma.loanApplication.findMany({
    where: {
      userId,
      status: {
        in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.DOCUMENTS_REQUIRED,
          ApplicationStatus.PENDING_APPROVAL,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      requestedAmount: true,
      requestedDays: true,
      submittedAt: true,
      createdAt: true,
    },
  });

  /* -------------------------------
   * 7. Recent payments
   * ----------------------------- */
  const recentPayments = await prisma.payment.findMany({
    where: { loan: { userId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      paymentReference: true,
      amount: true,
      paymentMethod: true,
      status: true,
      paymentDate: true,
      createdAt: true,
      loan: { select: { id: true, loanNumber: true } },
    },
  });

  /* -------------------------------
   * 8. Recent transactions
   * ----------------------------- */
  const recentTransactions = await prisma.loanTransaction.findMany({
    where: { loan: { userId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      transactionNumber: true,
      type: true,
      amount: true,
      balanceAfter: true,
      createdAt: true,
      loan: { select: { id: true, loanNumber: true } },
    },
  });

  /* -------------------------------
   * 9. Unread notifications
   * ----------------------------- */
  const unreadNotifications = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    },
    kyc: user.kyc
      ? {
          status: user.kyc.status,
          rejectionReason: user.kyc.rejectionReason,
          reviewedAt: user.kyc.reviewedAt,
        }
      : { status: null, rejectionReason: null, reviewedAt: null },
    summary: {
      totalBorrowed,
      totalPaidToDate,
      totalOutstanding,
      activeLoansCount: activeLoans.length,
      completedLoansCount,
      overdueCount,
      unreadNotifications,
    },
    activeLoans: activeLoansSummary,
    nextPayment,
    pendingApplications,
    recentPayments,
    recentTransactions,
  };
}

/* ============================================================
 * ADMIN DASHBOARD
 * ============================================================*/
export async function getAdminDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  /* -------------------------------
   * 1. Customer counts
   * ----------------------------- */
  const [
    totalCustomers,
    activeCustomers,
    suspendedCustomers,
    newCustomersThisMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "SUSPENDED" } }),
    prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: startOfMonth } },
    }),
  ]);

  /* -------------------------------
   * 2. KYC breakdown
   * ----------------------------- */
  const [kycPending, kycUnderReview, kycApproved, kycRejected] =
    await Promise.all([
      prisma.kyc.count({ where: { status: KycStatus.PENDING } }),
      prisma.kyc.count({ where: { status: KycStatus.UNDER_REVIEW } }),
      prisma.kyc.count({ where: { status: KycStatus.APPROVED } }),
      prisma.kyc.count({ where: { status: KycStatus.REJECTED } }),
    ]);

  /* -------------------------------
   * 3. Application funnel
   * ----------------------------- */
  const [
    appsDraft,
    appsSubmitted,
    appsUnderReview,
    appsDocsRequired,
    appsPendingApproval,
    appsApproved,
    appsRejected,
    appsCancelled,
    appsDisbursed,
  ] = await Promise.all([
    prisma.loanApplication.count({ where: { status: "DRAFT" } }),
    prisma.loanApplication.count({ where: { status: "SUBMITTED" } }),
    prisma.loanApplication.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.loanApplication.count({ where: { status: "DOCUMENTS_REQUIRED" } }),
    prisma.loanApplication.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.loanApplication.count({ where: { status: "APPROVED" } }),
    prisma.loanApplication.count({ where: { status: "REJECTED" } }),
    prisma.loanApplication.count({ where: { status: "CANCELLED" } }),
    prisma.loanApplication.count({ where: { status: "DISBURSED" } }),
  ]);

  /* -------------------------------
   * 4. Loan status counts
   * ----------------------------- */
  const loanStatuses: LoanStatus[] = [
    LoanStatus.PENDING_DISBURSEMENT,
    LoanStatus.ACTIVE,
    LoanStatus.PARTIALLY_PAID,
    LoanStatus.FULLY_PAID,
    LoanStatus.OVERDUE,
    LoanStatus.DEFAULTED,
    LoanStatus.WRITTEN_OFF,
    LoanStatus.CANCELLED,
  ];

  const loanCountsRaw = await prisma.loan.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const loanCounts: Record<string, number> = {};
  for (const s of loanStatuses) loanCounts[s] = 0;
  for (const row of loanCountsRaw) loanCounts[row.status] = row._count._all;

  /* -------------------------------
   * 5. Financial aggregates
   * ----------------------------- */
  const financialAgg = await prisma.loan.aggregate({
    _sum: {
      principalAmount: true,
      totalAmount: true,
      amountPaid: true,
      outstandingAmount: true,
      penaltyAmount: true,
      interestAmount: true,
      processingFee: true,
    },
  });

  const disbursedAgg = await prisma.loan.aggregate({
    where: { disbursedAt: { not: null } },
    _sum: { principalAmount: true },
  });

  /* -------------------------------
   * 6. Payments
   * ----------------------------- */
  const [
    paymentsThisMonthAgg,
    paymentsTodayAgg,
    paymentsTotalAgg,
    paymentsCompletedCount,
    paymentsPendingCount,
    paymentsFailedCount,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
  ]);

  /* -------------------------------
   * 7. Repayment schedule — upcoming & overdue
   * ----------------------------- */
  const [
    repaymentsDueThisWeek,
    repaymentsOverdue,
    repaymentsPaid,
  ] = await Promise.all([
    prisma.repaymentSchedule.aggregate({
      where: {
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { outstandingAmount: true },
      _count: { _all: true },
    }),
    prisma.repaymentSchedule.aggregate({
      where: {
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lt: now },
      },
      _sum: { outstandingAmount: true },
      _count: { _all: true },
    }),
    prisma.repaymentSchedule.count({ where: { status: "PAID" } }),
  ]);

  /* -------------------------------
   * 8. Recent activity (last 10)
   * ----------------------------- */
  const recentApplications = await prisma.loanApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      requestedAmount: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  const recentPayments = await prisma.payment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      paymentReference: true,
      amount: true,
      paymentMethod: true,
      paymentDate: true,
      createdAt: true,
      loan: {
        select: {
          id: true,
          loanNumber: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const recentLoans = await prisma.loan.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      loanNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  /* -------------------------------
   * 9. Top borrowers (highest outstanding)
   * ----------------------------- */
  const topBorrowersRaw = await prisma.loan.groupBy({
    by: ["userId"],
    where: {
      status: {
        in: [
          LoanStatus.ACTIVE,
          LoanStatus.PARTIALLY_PAID,
          LoanStatus.OVERDUE,
        ],
      },
    },
    _sum: { outstandingAmount: true },
    orderBy: { _sum: { outstandingAmount: "desc" } },
    take: 5,
  });

  const topBorrowers = await Promise.all(
    topBorrowersRaw.map(async (row) => {
      const u = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      return {
        user: u,
        outstanding: Number(row._sum.outstandingAmount ?? 0),
      };
    })
  );

  /* -------------------------------
   * 10. Pending reviews (action items)
   * ----------------------------- */
  const pendingKycCount = kycPending + kycUnderReview;
  const pendingApplicationsCount =
    appsSubmitted + appsUnderReview + appsDocsRequired + appsPendingApproval;
  const pendingDocumentsCount = await prisma.document.count({
    where: { status: "PENDING" },
  });

  return {
    generatedAt: now,

    /* Customers */
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      suspended: suspendedCustomers,
      newThisMonth: newCustomersThisMonth,
    },

    /* KYC */
    kyc: {
      pending: kycPending,
      underReview: kycUnderReview,
      approved: kycApproved,
      rejected: kycRejected,
      requiresAction: pendingKycCount,
    },

    /* Applications */
    applications: {
      total:
        appsDraft +
        appsSubmitted +
        appsUnderReview +
        appsDocsRequired +
        appsPendingApproval +
        appsApproved +
        appsRejected +
        appsCancelled +
        appsDisbursed,
      byStatus: {
        DRAFT: appsDraft,
        SUBMITTED: appsSubmitted,
        UNDER_REVIEW: appsUnderReview,
        DOCUMENTS_REQUIRED: appsDocsRequired,
        PENDING_APPROVAL: appsPendingApproval,
        APPROVED: appsApproved,
        REJECTED: appsRejected,
        CANCELLED: appsCancelled,
        DISBURSED: appsDisbursed,
      },
      requiresAction: pendingApplicationsCount,
    },

    /* Loans */
    loans: {
      total: Object.values(loanCounts).reduce((a, b) => a + b, 0),
      byStatus: loanCounts,
      active:
        loanCounts[LoanStatus.ACTIVE] +
        loanCounts[LoanStatus.PARTIALLY_PAID],
      overdue:
        loanCounts[LoanStatus.OVERDUE] + loanCounts[LoanStatus.DEFAULTED],
    },

    /* Financials */
    financials: {
      totalPrincipalDisbursed: Number(
        disbursedAgg._sum.principalAmount ?? 0
      ),
      totalPortfolioValue: Number(financialAgg._sum.totalAmount ?? 0),
      totalAmountPaid: Number(financialAgg._sum.amountPaid ?? 0),
      totalOutstanding: Number(
        financialAgg._sum.outstandingAmount ?? 0
      ),
      totalInterestEarned: Number(
        financialAgg._sum.interestAmount ?? 0
      ),
      totalProcessingFees: Number(
        financialAgg._sum.processingFee ?? 0
      ),
      totalPenalties: Number(financialAgg._sum.penaltyAmount ?? 0),
    },

    /* Payments */
    payments: {
      totalCount: paymentsCompletedCount,
      pendingCount: paymentsPendingCount,
      failedCount: paymentsFailedCount,
      totalReceived: Number(paymentsTotalAgg._sum.amount ?? 0),
      receivedThisMonth: Number(
        paymentsThisMonthAgg._sum.amount ?? 0
      ),
      receivedToday: Number(paymentsTodayAgg._sum.amount ?? 0),
    },

    /* Repayments */
    repayments: {
      paidCount: repaymentsPaid,
      dueThisWeekCount: repaymentsDueThisWeek._count._all,
      dueThisWeekAmount: Number(
        repaymentsDueThisWeek._sum.outstandingAmount ?? 0
      ),
      overdueCount: repaymentsOverdue._count._all,
      overdueAmount: Number(
        repaymentsOverdue._sum.outstandingAmount ?? 0
      ),
    },

    /* Action items — for the top of the dashboard */
    actions: {
      pendingKyc: pendingKycCount,
      pendingApplications: pendingApplicationsCount,
      pendingDocuments: pendingDocumentsCount,
      overdueLoans:
        loanCounts[LoanStatus.OVERDUE] +
        loanCounts[LoanStatus.DEFAULTED],
    },

    /* Recent activity */
    recentApplications,
    recentPayments,
    recentLoans,

    /* Top borrowers */
    topBorrowers,
  };
}