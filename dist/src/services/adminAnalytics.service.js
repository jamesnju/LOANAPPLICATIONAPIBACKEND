import { prisma } from "../config/prisma.js";
const ANALYTICS_ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE_OFFICER"];
async function checkAnalyticsAccess(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (!user || !ANALYTICS_ROLES.includes(user.role)) {
        throw new Error("UNAUTHORIZED");
    }
}
/* ============================================================
 * OVERVIEW — high-level KPIs with period-over-period deltas
 * ============================================================ */
export async function getAnalyticsOverview(userId) {
    await checkAnalyticsAccess(userId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const [totalCustomers, customersLast30, customersPrevious30, activeLoans, totalDisbursed, disbursedLast30, disbursedPrevious30, collectedLast30, collectedPrevious30, portfolioAtRisk, totalOutstanding,] = await Promise.all([
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.user.count({
            where: { role: "CUSTOMER", createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
            where: {
                role: "CUSTOMER",
                createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
        }),
        prisma.loan.count({
            where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
        }),
        prisma.loan.aggregate({
            _sum: { principalAmount: true },
            where: { status: { not: "CANCELLED" } },
        }),
        prisma.loan.aggregate({
            _sum: { principalAmount: true },
            where: {
                disbursedAt: { gte: thirtyDaysAgo },
                status: { not: "CANCELLED" },
            },
        }),
        prisma.loan.aggregate({
            _sum: { principalAmount: true },
            where: {
                disbursedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                status: { not: "CANCELLED" },
            },
        }),
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: "COMPLETED",
                processedAt: { gte: thirtyDaysAgo },
            },
        }),
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: "COMPLETED",
                processedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
        }),
        prisma.loan.aggregate({
            _sum: { outstandingAmount: true },
            where: { status: "OVERDUE" },
        }),
        prisma.loan.aggregate({
            _sum: { outstandingAmount: true },
            where: {
                status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE"] },
            },
        }),
    ]);
    /* Period-over-period deltas (percent change) */
    const pct = (current, previous) => {
        if (previous === 0)
            return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    const disbursedNow = Number(disbursedLast30._sum.principalAmount ?? 0);
    const disbursedPrev = Number(disbursedPrevious30._sum.principalAmount ?? 0);
    const collectedNow = Number(collectedLast30._sum.amount ?? 0);
    const collectedPrev = Number(collectedPrevious30._sum.amount ?? 0);
    const parAmount = Number(portfolioAtRisk._sum.outstandingAmount ?? 0);
    const totalOutstandingAmount = Number(totalOutstanding._sum.outstandingAmount ?? 0);
    return {
        customers: {
            total: totalCustomers,
            newLast30: customersLast30,
            growthPct: pct(customersLast30, customersPrevious30),
        },
        loans: {
            active: activeLoans,
            totalDisbursed: Number(totalDisbursed._sum.principalAmount ?? 0),
            disbursedLast30: disbursedNow,
            disbursementGrowthPct: pct(disbursedNow, disbursedPrev),
        },
        collections: {
            collectedLast30: collectedNow,
            collectionGrowthPct: pct(collectedNow, collectedPrev),
        },
        risk: {
            portfolioAtRisk: parAmount,
            parRatio: totalOutstandingAmount > 0
                ? (parAmount / totalOutstandingAmount) * 100
                : 0,
            totalOutstanding: totalOutstandingAmount,
        },
    };
}
/* ============================================================
 * TIME SERIES — daily/monthly buckets for a given metric
 * ============================================================ */
export async function getAnalyticsTimeSeries(userId, opts) {
    await checkAnalyticsAccess(userId);
    const days = Math.min(opts.days ?? 30, 365);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    /* Bucket by day using raw SQL for correctness across timezones.
     * Prisma groupBy on a truncated date isn't supported natively. */
    switch (opts.metric) {
        case "disbursements": {
            const rows = await prisma.$queryRaw `
        SELECT date_trunc('day', "disbursedAt") AS day,
               COUNT(*)::bigint AS count,
               SUM("principalAmount")::text AS amount
        FROM "Loan"
        WHERE "disbursedAt" >= ${start}
          AND status <> 'CANCELLED'
        GROUP BY day
        ORDER BY day ASC
      `;
            return rows.map((r) => ({
                day: r.day,
                count: Number(r.count),
                amount: Number(r.amount ?? 0),
            }));
        }
        case "collections": {
            const rows = await prisma.$queryRaw `
        SELECT date_trunc('day', "processedAt") AS day,
               COUNT(*)::bigint AS count,
               SUM(amount)::text AS amount
        FROM "Payment"
        WHERE "processedAt" >= ${start}
          AND status = 'COMPLETED'
        GROUP BY day
        ORDER BY day ASC
      `;
            return rows.map((r) => ({
                day: r.day,
                count: Number(r.count),
                amount: Number(r.amount ?? 0),
            }));
        }
        case "applications": {
            const rows = await prisma.$queryRaw `
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::bigint AS count
        FROM "LoanApplication"
        WHERE "createdAt" >= ${start}
        GROUP BY day
        ORDER BY day ASC
      `;
            return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
        }
        case "new-customers": {
            const rows = await prisma.$queryRaw `
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= ${start}
          AND role = 'CUSTOMER'
        GROUP BY day
        ORDER BY day ASC
      `;
            return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
        }
    }
}
/* ============================================================
 * LOAN PRODUCT BREAKDOWN
 * ============================================================ */
export async function getProductPerformance(userId) {
    await checkAnalyticsAccess(userId);
    const products = await prisma.loanProduct.findMany({
        select: {
            id: true,
            name: true,
            code: true,
            loans: {
                select: {
                    status: true,
                    principalAmount: true,
                    outstandingAmount: true,
                },
            },
            applications: {
                select: { status: true },
            },
        },
    });
    return products.map((p) => {
        const loans = p.loans;
        const active = loans.filter((l) => ["ACTIVE", "PARTIALLY_PAID"].includes(l.status));
        const overdue = loans.filter((l) => l.status === "OVERDUE");
        const fullyPaid = loans.filter((l) => l.status === "FULLY_PAID");
        const totalDisbursed = loans.reduce((sum, l) => sum + Number(l.principalAmount), 0);
        const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
        const overdueOutstanding = overdue.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
        const applications = p.applications;
        const approvalRate = applications.length > 0
            ? (applications.filter((a) => ["APPROVED", "DISBURSED"].includes(a.status)).length /
                applications.length) *
                100
            : 0;
        return {
            productId: p.id,
            name: p.name,
            code: p.code,
            metrics: {
                totalLoans: loans.length,
                activeLoans: active.length,
                overdueLoans: overdue.length,
                fullyPaidLoans: fullyPaid.length,
                totalDisbursed,
                totalOutstanding,
                overdueOutstanding,
                defaultRate: loans.length > 0 ? (overdue.length / loans.length) * 100 : 0,
                applicationCount: applications.length,
                approvalRate,
            },
        };
    });
}
/* ============================================================
 * VINTAGE / COHORT ANALYSIS
 * ============================================================
 * Groups loans by the month they were disbursed and shows how
 * each cohort has performed. Useful for spotting deteriorating
 * loan quality early.
 */
export async function getCohortAnalysis(userId) {
    await checkAnalyticsAccess(userId);
    const rows = await prisma.$queryRaw `
    SELECT
      date_trunc('month', "disbursedAt") AS cohort_month,
      COUNT(*)::bigint AS loans,
      SUM("principalAmount")::text AS disbursed,
      SUM("outstandingAmount")::text AS outstanding,
      SUM("amountPaid")::text AS paid,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END)::bigint AS overdue
    FROM "Loan"
    WHERE "disbursedAt" IS NOT NULL
      AND status <> 'CANCELLED'
    GROUP BY cohort_month
    ORDER BY cohort_month DESC
    LIMIT 12
  `;
    return rows.map((r) => {
        const loans = Number(r.loans);
        const disbursed = Number(r.disbursed ?? 0);
        const paid = Number(r.paid ?? 0);
        const overdue = Number(r.overdue);
        return {
            cohortMonth: r.cohort_month,
            loans,
            disbursed,
            outstanding: Number(r.outstanding ?? 0),
            paid,
            repaymentRate: disbursed > 0 ? (paid / disbursed) * 100 : 0,
            overdueLoans: overdue,
            defaultRate: loans > 0 ? (overdue / loans) * 100 : 0,
        };
    });
}
/* ============================================================
 * RECENT ACTIVITY FEED
 * ============================================================ */
export async function getActivityFeed(userId, limit = 20) {
    await checkAnalyticsAccess(userId);
    const [recentLoans, recentPayments, recentApplications, recentKyc] = await Promise.all([
        prisma.loan.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                loanNumber: true,
                status: true,
                principalAmount: true,
                createdAt: true,
                user: { select: { firstName: true, lastName: true } },
            },
        }),
        prisma.payment.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                createdAt: true,
                loan: { select: { loanNumber: true } },
            },
        }),
        prisma.loanApplication.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                applicationNumber: true,
                status: true,
                requestedAmount: true,
                createdAt: true,
                user: { select: { firstName: true, lastName: true } },
            },
        }),
        prisma.kyc.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                status: true,
                createdAt: true,
                user: { select: { firstName: true, lastName: true } },
            },
        }),
    ]);
    /* Merge and sort by date */
    const feed = [
        ...recentLoans.map((l) => ({
            type: "loan",
            id: l.id,
            title: `Loan ${l.loanNumber} — ${l.user.firstName} ${l.user.lastName}`,
            status: l.status,
            amount: Number(l.principalAmount),
            at: l.createdAt,
        })),
        ...recentPayments.map((p) => ({
            type: "payment",
            id: p.id,
            title: `Payment for ${p.loan.loanNumber} via ${p.paymentMethod}`,
            status: p.status,
            amount: Number(p.amount),
            at: p.createdAt,
        })),
        ...recentApplications.map((a) => ({
            type: "application",
            id: a.id,
            title: `Application ${a.applicationNumber} — ${a.user.firstName} ${a.user.lastName}`,
            status: a.status,
            amount: Number(a.requestedAmount),
            at: a.createdAt,
        })),
        ...recentKyc.map((k) => ({
            type: "kyc",
            id: k.id,
            title: `KYC — ${k.user.firstName} ${k.user.lastName}`,
            status: k.status,
            amount: null,
            at: k.createdAt,
        })),
    ]
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, limit);
    return feed;
}
//# sourceMappingURL=adminAnalytics.service.js.map