import { prisma } from "../config/prisma.js";

import type { Role } from "../generated/prisma/enums.js";

const ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
];

export async function getAdminDashboard(
  userId: string,
) {
  const admin =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

  if (
    !admin ||
    !ADMIN_ROLES.includes(admin.role)
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const [
    totalCustomers,
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    totalLoans,
    activeLoans,
    overdueLoans,
    fullyPaidLoans,
    totalDisbursed,
    totalCollected,
    totalOutstanding,
    recentApplications,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    prisma.loanApplication.count(),

    prisma.loanApplication.count({
      where: {
        status: {
          in: [
            "SUBMITTED",
            "UNDER_REVIEW",
            "DOCUMENTS_REQUIRED",
            "PENDING_APPROVAL",
          ],
        },
      },
    }),

    prisma.loanApplication.count({
      where: {
        status: "APPROVED",
      },
    }),

    prisma.loanApplication.count({
      where: {
        status: "REJECTED",
      },
    }),

    prisma.loan.count(),

    prisma.loan.count({
      where: {
        status: {
          in: [
            "ACTIVE",
            "PARTIALLY_PAID",
          ],
        },
      },
    }),

    prisma.loan.count({
      where: {
        status: "OVERDUE",
      },
    }),

    prisma.loan.count({
      where: {
        status: "FULLY_PAID",
      },
    }),

    prisma.loan.aggregate({
      _sum: {
        principalAmount: true,
      },
      where: {
        status: {
          not: "CANCELLED",
        },
      },
    }),

    prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.loan.aggregate({
      _sum: {
        outstandingAmount: true,
      },
      where: {
        status: {
          in: [
            "ACTIVE",
            "PARTIALLY_PAID",
            "OVERDUE",
          ],
        },
      },
    }),

    prisma.loanApplication.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        loanProduct: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.payment.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        loan: {
          select: {
            loanNumber: true,
          },
        },
      },
    }),
  ]);

  return {
    customers: {
      total: totalCustomers,
    },

    applications: {
      total: totalApplications,
      pending: pendingApplications,
      approved: approvedApplications,
      rejected: rejectedApplications,
    },

    loans: {
      total: totalLoans,
      active: activeLoans,
      overdue: overdueLoans,
      fullyPaid: fullyPaidLoans,
    },

    financial: {
      totalDisbursed:
        totalDisbursed._sum.principalAmount ?? 0,

      totalCollected:
        totalCollected._sum.amount ?? 0,

      totalOutstanding:
        totalOutstanding._sum.outstandingAmount ?? 0,
    },

    recentApplications,

    recentPayments,
  };
}