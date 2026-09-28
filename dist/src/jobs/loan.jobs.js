import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import { notifyUser, } from "../services/notification.service.js";
import { updateOverdueSchedules, } from "../services/repaymentSchedule.service.js";
/*
 * Update overdue loans
 *
 * Runs every hour.
 */
async function updateOverdueLoansJob() {
    try {
        console.log("[JOB] Checking overdue loans...");
        const now = new Date();
        const loans = await prisma.loan.findMany({
            where: {
                status: {
                    in: [
                        "ACTIVE",
                        "PARTIALLY_PAID",
                    ],
                },
                maturityDate: {
                    lt: now,
                },
                outstandingAmount: {
                    gt: 0,
                },
            },
        });
        for (const loan of loans) {
            await prisma.loan.update({
                where: {
                    id: loan.id,
                },
                data: {
                    status: "OVERDUE",
                },
            });
            await notifyUser(loan.userId, "REPAYMENT_OVERDUE", "Loan repayment overdue", `Your loan ${loan.loanNumber} has passed its repayment date and still has an outstanding balance.`, {
                loanId: loan.id,
                loanNumber: loan.loanNumber,
            });
        }
        console.log(`[JOB] ${loans.length} overdue loans updated`);
    }
    catch (error) {
        console.error("[JOB] Failed to update overdue loans:", error);
    }
}
/*
 * Update overdue repayment schedules
 */
async function updateOverdueSchedulesJob() {
    try {
        console.log("[JOB] Checking overdue repayment schedules...");
        const result = await updateOverdueSchedules();
        console.log("[JOB] Repayment schedules updated:", result);
    }
    catch (error) {
        console.error("[JOB] Failed to update repayment schedules:", error);
    }
}
/*
 * Send repayment reminders
 *
 * Runs every day at 9:00 AM.
 *
 * It looks for repayment schedules that
 * are due exactly 5 days from today.
 */
async function sendRepaymentRemindersJob() {
    try {
        console.log("[JOB] Checking repayment reminders...");
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 5);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        const schedules = await prisma.repaymentSchedule.findMany({
            where: {
                dueDate: {
                    gte: startDate,
                    lte: endDate,
                },
                outstandingAmount: {
                    gt: 0,
                },
                status: {
                    in: [
                        "PENDING",
                        "PARTIALLY_PAID",
                    ],
                },
            },
            include: {
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
        for (const schedule of schedules) {
            await notifyUser(schedule.loan.userId, "REPAYMENT_DUE", "Loan repayment reminder", `Your loan ${schedule.loan.loanNumber} repayment is due in 5 days.`, {
                loanId: schedule.loan.id,
                scheduleId: schedule.id,
                dueDate: schedule.dueDate,
            });
        }
        console.log(`[JOB] ${schedules.length} repayment reminders created`);
    }
    catch (error) {
        console.error("[JOB] Failed to send repayment reminders:", error);
    }
}
/*
 * Start all background jobs.
 */
export function startLoanJobs() {
    /*
     * Every hour
     */
    cron.schedule("0 * * * *", async () => {
        await updateOverdueSchedulesJob();
        await updateOverdueLoansJob();
    });
    /*
     * Every day at 9:00 AM
     */
    cron.schedule("0 9 * * *", async () => {
        await sendRepaymentRemindersJob();
    });
    console.log("Loan background jobs started");
}
//# sourceMappingURL=loan.jobs.js.map