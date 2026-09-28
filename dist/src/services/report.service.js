import { prisma } from "../config/prisma.js";
const REPORT_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "FINANCE_OFFICER",
    "LOAN_OFFICER",
];
async function checkReportAccess(userId) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            role: true,
        },
    });
    if (!user ||
        !REPORT_ROLES.includes(user.role)) {
        throw new Error("UNAUTHORIZED");
    }
}
/*
 * LOAN PORTFOLIO REPORT
 */
export async function getLoanPortfolioReport(userId, filters) {
    await checkReportAccess(userId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const where = {};
    if (filters.startDate ||
        filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte =
                filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte =
                filters.endDate;
        }
    }
    const [loans, total] = await Promise.all([
        prisma.loan.findMany({
            where,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                loanProduct: {
                    select: {
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.loan.count({
            where,
        }),
    ]);
    return {
        loans,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
/*
 * PAYMENT REPORT
 */
export async function getPaymentReport(userId, filters) {
    await checkReportAccess(userId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const where = {
        status: "COMPLETED",
    };
    if (filters.startDate ||
        filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte =
                filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte =
                filters.endDate;
        }
    }
    const [payments, total, aggregate,] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                loan: {
                    select: {
                        loanNumber: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.payment.count({
            where,
        }),
        prisma.payment.aggregate({
            where,
            _sum: {
                amount: true,
            },
        }),
    ]);
    return {
        payments,
        summary: {
            totalPayments: total,
            totalAmount: aggregate._sum.amount ?? 0,
        },
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
/*
 * OVERDUE LOAN REPORT
 */
export async function getOverdueLoanReport(userId) {
    await checkReportAccess(userId);
    return prisma.loan.findMany({
        where: {
            status: "OVERDUE",
            outstandingAmount: {
                gt: 0,
            },
        },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                },
            },
            loanProduct: {
                select: {
                    name: true,
                },
            },
        },
        orderBy: {
            maturityDate: "asc",
        },
    });
}
/*
 * APPLICATION REPORT
 */
export async function getApplicationReport(userId, filters) {
    await checkReportAccess(userId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const where = {};
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.startDate ||
        filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte =
                filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte =
                filters.endDate;
        }
    }
    const [applications, total,] = await Promise.all([
        prisma.loanApplication.findMany({
            where,
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
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.loanApplication.count({
            where,
        }),
    ]);
    return {
        applications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
//# sourceMappingURL=report.service.js.map