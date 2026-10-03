/*
 * ============================================================
 * REPAYMENT SCHEDULE SERVICE
 * ============================================================
 *
 * Current loan design:
 *
 * - One loan
 * - One final repayment
 * - Due date = loan maturity date
 *
 * Example:
 *
 * Principal:       KSh 3,000
 * Interest:        KSh 300
 * Processing fee:  KSh 100
 * Total:           KSh 3,400
 * Repayment days:  30
 *
 * Schedule:
 *
 * Installment #1
 * Due date: maturity date
 * Principal: KSh 3,000
 * Interest: KSh 300
 * Total: KSh 3,400
 */
import { prisma } from "../config/prisma.js";
import { LoanStatus, RepaymentStatus, Role } from "../generated/prisma/enums.js";
import { logAction } from "./auditLog.service.js";
import { notifyUser } from "./notification.service.js";
/*
 * ============================================================
 * GENERATE REPAYMENT SCHEDULE
 * ============================================================
 */
export const generateRepaymentSchedule = async (loanId, userId) => {
    /*
     * Get the loan together with its existing schedule.
     */
    const loan = await prisma.loan.findUnique({
        where: {
            id: loanId,
        },
        include: {
            repaymentSchedules: true,
        },
    });
    /*
     * Make sure the loan exists.
     */
    if (!loan) {
        throw new Error("Loan not found");
    }
    /*
     * Get the user requesting the operation.
     */
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    /*
     * Only finance/admin users should generate
     * repayment schedules.
     */
    const allowedRoles = [
        Role.FINANCE_OFFICER,
        Role.ADMIN,
        Role.SUPER_ADMIN,
    ];
    if (!allowedRoles.includes(user.role)) {
        throw new Error("You are not authorized to generate a repayment schedule");
    }
    /*
     * A schedule should only be generated for
     * an active loan.
     */
    if (loan.status !== LoanStatus.ACTIVE) {
        throw new Error("Repayment schedule can only be generated for an active loan");
    }
    /*
     * The loan must have been disbursed.
     */
    if (!loan.disbursedAt) {
        throw new Error("Loan has not been disbursed");
    }
    /*
     * The loan must have a maturity date.
     */
    if (!loan.maturityDate) {
        throw new Error("Loan does not have a maturity date");
    }
    /*
     * Prevent duplicate schedules.
     */
    if (loan.repaymentSchedules.length > 0) {
        throw new Error("Repayment schedule already exists for this loan");
    }
    /*
     * ========================================================
     * CREATE THE SINGLE FINAL INSTALLMENT
     * ========================================================
     */
    const schedule = await prisma.repaymentSchedule.create({
        data: {
            loanId: loan.id,
            /*
             * Current system supports one final repayment.
             */
            installmentNumber: 1,
            /*
             * Payment is due on the maturity date.
             */
            dueDate: loan.maturityDate,
            /*
             * Entire principal is due.
             */
            principalAmount: loan.principalAmount,
            /*
             * Entire interest amount is due.
             */
            interestAmount: loan.interestAmount,
            /*
             * No penalty at the beginning.
             */
            penaltyAmount: 0,
            /*
             * Total amount customer must repay.
             */
            totalAmount: loan.totalAmount,
            /*
             * Nothing has been paid yet.
             */
            amountPaid: 0,
            /*
             * Entire amount is outstanding.
             */
            outstandingAmount: loan.totalAmount,
            /*
             * Initial status.
             */
            status: RepaymentStatus.PENDING,
        },
    });
    await logAction({
        userId,
        action: "CREATE",
        entity: "RepaymentSchedule",
        entityId: schedule.id,
        description: `Repayment schedule generated for loan ${loan.loanNumber}`,
        newValue: {
            installmentNumber: schedule.installmentNumber,
            dueDate: schedule.dueDate,
            totalAmount: schedule.totalAmount.toString(),
        },
    });
    await notifyUser(loan.userId, "REPAYMENT_DUE", "Repayment schedule ready", `Hi ${loan.userId ?? "there"}, your repayment schedule for loan ${loan.loanNumber} is now available. Total repayment is KES ${Number(loan.totalAmount).toLocaleString()}, due on ${loan.maturityDate.toLocaleDateString()}.`, {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        scheduleId: schedule.id,
        dueDate: loan.maturityDate.toISOString(),
    }).catch((err) => {
        console.error("[RepaymentSchedule] Failed to send schedule notification:", err);
    });
    return schedule;
};
/*
 * ============================================================
 * GET ALL SCHEDULES FOR A LOAN
 * ============================================================
 */
export const getLoanRepaymentSchedules = async (loanId, userId) => {
    /*
     * Find the loan.
     */
    const loan = await prisma.loan.findUnique({
        where: {
            id: loanId,
        },
        select: {
            id: true,
            userId: true,
        },
    });
    if (!loan) {
        throw new Error("Loan not found");
    }
    /*
     * Find the requesting user.
     */
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            role: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    /*
     * Customers can only see their own loan schedules.
     */
    const staffRoles = [
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.LOAN_OFFICER,
        Role.FINANCE_OFFICER,
        Role.SUPPORT,
    ];
    const isStaff = staffRoles.includes(user.role);
    if (!isStaff && loan.userId !== userId) {
        throw new Error("You are not authorized to view this repayment schedule");
    }
    /*
     * Get schedules.
     */
    return prisma.repaymentSchedule.findMany({
        where: {
            loanId,
        },
        orderBy: {
            installmentNumber: "asc",
        },
    });
};
/*
 * ============================================================
 * GET ONE REPAYMENT SCHEDULE
 * ============================================================
 */
export const getRepaymentScheduleById = async (scheduleId, userId) => {
    /*
     * Get schedule together with loan.
     */
    const schedule = await prisma.repaymentSchedule.findUnique({
        where: {
            id: scheduleId,
        },
        include: {
            loan: {
                select: {
                    id: true,
                    userId: true,
                    loanNumber: true,
                    status: true,
                },
            },
        },
    });
    if (!schedule) {
        throw new Error("Repayment schedule not found");
    }
    /*
     * Find requesting user.
     */
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            role: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    /*
     * Staff members can view schedules.
     */
    const staffRoles = [
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.LOAN_OFFICER,
        Role.FINANCE_OFFICER,
        Role.SUPPORT,
    ];
    const isStaff = staffRoles.includes(user.role);
    /*
     * Customers can only view their own schedule.
     */
    if (!isStaff && schedule.loan.userId !== userId) {
        throw new Error("You are not authorized to view this repayment schedule");
    }
    return schedule;
};
/*
 * ============================================================
 * GET CUSTOMER'S REPAYMENT SCHEDULES
 * ============================================================
 *
 * This is useful for the customer dashboard.
 *
 * Instead of:
 *
 * GET /loans/:id/schedules
 *
 * the frontend can simply request:
 *
 * GET /repayment-schedules/me
 *
 * and receive schedules for all the customer's loans.
 */
export const getMyRepaymentSchedules = async (userId) => {
    return prisma.repaymentSchedule.findMany({
        where: {
            loan: {
                userId,
            },
        },
        include: {
            loan: {
                select: {
                    id: true,
                    loanNumber: true,
                    principalAmount: true,
                    totalAmount: true,
                    amountPaid: true,
                    outstandingAmount: true,
                    status: true,
                    disbursedAt: true,
                    maturityDate: true,
                },
            },
        },
        orderBy: {
            dueDate: "asc",
        },
    });
};
/*
 * ============================================================
 * UPDATE OVERDUE SCHEDULES
 * ============================================================
 *
 * This will later be called by a background job.
 *
 * For now it can also be called manually from an API.
 *
 * A schedule becomes overdue when:
 *
 * dueDate < current date
 *
 * AND
 *
 * outstandingAmount > 0
 */
export const updateOverdueSchedules = async () => {
    const now = new Date();
    /*
     * Find all pending/partially-paid schedules
     * whose due date has passed.
     */
    const overdueSchedules = await prisma.repaymentSchedule.findMany({
        where: {
            dueDate: {
                lt: now,
            },
            outstandingAmount: {
                gt: 0,
            },
            status: {
                in: [
                    RepaymentStatus.PENDING,
                    RepaymentStatus.PARTIALLY_PAID,
                ],
            },
        },
    });
    /*
     * Update each schedule.
     */
    for (const schedule of overdueSchedules) {
        await prisma.repaymentSchedule.update({
            where: {
                id: schedule.id,
            },
            data: {
                status: RepaymentStatus.OVERDUE,
            },
        });
        /*
         * Also update the parent loan.
         */
        await prisma.loan.update({
            where: {
                id: schedule.loanId,
            },
            data: {
                status: LoanStatus.OVERDUE,
            },
        });
    }
    return {
        updatedCount: overdueSchedules.length,
    };
};
//# sourceMappingURL=repaymentSchedule.service.js.map