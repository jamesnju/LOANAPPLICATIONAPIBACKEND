import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import { notifyUser } from "../services/notification.service.js";
import { updateOverdueSchedules } from "../services/repaymentSchedule.service.js";

/* ============================================================
 * JOB: mark overdue loans
 * ============================================================ */
export async function runLoanOverdueJob() {
  console.log("[JOB overdue-loans] starting at", new Date().toISOString());

  const now = new Date();

  const loans = await prisma.loan.findMany({
    where: {
      status: { in: ["ACTIVE", "PARTIALLY_PAID"] },
      maturityDate: { lt: now },
      outstandingAmount: { gt: 0 },
    },
  });

  console.log(`[JOB overdue-loans] found ${loans.length} overdue loans`);

  let notified = 0;

  for (const loan of loans) {
    try {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "OVERDUE" },
      });

      const outstanding = Number(loan.outstandingAmount).toLocaleString(
        "en-KE",
      );
      const daysOverdue = loan.maturityDate
        ? Math.floor(
            (now.getTime() - loan.maturityDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

      await notifyUser(
        loan.userId,
        "REPAYMENT_OVERDUE",
        "Loan repayment overdue",
        `Your loan ${loan.loanNumber} is now ${daysOverdue} day${
          daysOverdue === 1 ? "" : "s"
        } overdue. Outstanding balance: KES ${outstanding}. Please make a payment as soon as possible to avoid penalties.`,
        {
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          outstandingAmount: Number(loan.outstandingAmount),
          daysOverdue,
          maturityDate: loan.maturityDate?.toISOString(),
        },
      );

      notified++;
    } catch (err) {
      console.error(
        `[JOB overdue-loans] failed for loan ${loan.loanNumber}:`,
        err,
      );
    }
  }

  console.log(
    `[JOB overdue-loans] done — updated=${loans.length} notified=${notified}`,
  );
  return { updated: loans.length, notified };
}


/* ============================================================
 * JOB: overdue repayment schedules
 * ============================================================ */
export async function runOverdueSchedulesJob() {
  console.log("[JOB] Checking overdue repayment schedules...");
  const result = await updateOverdueSchedules();
  console.log("[JOB] Repayment schedules updated:", result);
  return result;
}

/* ============================================================
 * JOB: send repayment reminders (5 days before due)
 * ============================================================ */
export async function runRepaymentRemindersJob() {
  console.log("[JOB reminders] starting at", new Date().toISOString());

  const HORIZON_DAYS = 7;

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + HORIZON_DAYS);
  rangeEnd.setHours(23, 59, 59, 999);

  console.log(
    `[JOB reminders] window: ${rangeStart.toISOString()} → ${rangeEnd.toISOString()}`,
  );

  /* Query on Loan.maturityDate — the field the customer sees. */
  const loans = await prisma.loan.findMany({
    where: {
      status: { in: ["ACTIVE", "PARTIALLY_PAID"] },
      outstandingAmount: { gt: 0 },
      maturityDate: { gte: rangeStart, lte: rangeEnd },
    },
    select: {
      id: true,
      loanNumber: true,
      userId: true,
      maturityDate: true,
      outstandingAmount: true,
    },
  });

  console.log(`[JOB reminders] found ${loans.length} loans due within ${HORIZON_DAYS} days`);

  let sent = 0;
  for (const loan of loans) {
    /* Idempotency — one reminder per loan per day. */
    const alreadySentToday = await prisma.notification.findFirst({
      where: {
        userId: loan.userId,
        type: "REPAYMENT_DUE",
        createdAt: { gte: rangeStart },
        metadata: {
          path: ["loanId"],
          equals: loan.id,
        },
      },
    });

    if (alreadySentToday) {
      console.log(
        `[JOB reminders] already sent today for ${loan.loanNumber}, skipping`,
      );
      continue;
    }

    const daysLeft = Math.ceil(
      (loan.maturityDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const label =
      daysLeft <= 0
        ? "due today"
        : daysLeft === 1
          ? "due tomorrow"
          : `due in ${daysLeft} days`;

    try {
      await notifyUser(
        loan.userId,
        "REPAYMENT_DUE",
        daysLeft <= 0
          ? "Loan repayment due today"
          : `Loan repayment ${label}`,
        `Your loan ${loan.loanNumber} is ${label} (maturity: ${loan.maturityDate!.toLocaleDateString()}). Outstanding balance: KES ${Number(loan.outstandingAmount).toLocaleString()}. Please ensure your M-Pesa has sufficient funds.`,
        {
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          dueDate: loan.maturityDate!.toISOString(),
          daysLeft,
        },
      );
      sent++;
    } catch (err) {
      console.error(
        `[JOB reminders] failed to notify for loan ${loan.loanNumber}:`,
        err,
      );
    }
  }

  console.log(`[JOB reminders] done — sent=${sent}`);
  return { sent };
}
// export async function runRepaymentRemindersJob() {
//   console.log("[JOB reminders] starting at", new Date().toISOString());

//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() + 5);
//   startDate.setHours(0, 0, 0, 0);

//   const endDate = new Date(startDate);
//   endDate.setHours(23, 59, 59, 999);

//   console.log("[JOB reminders] window:", startDate.toISOString(), "→", endDate.toISOString());

//   const schedules = await prisma.repaymentSchedule.findMany({
//     where: {
//       dueDate: { gte: startDate, lte: endDate },
//       outstandingAmount: { gt: 0 },
//       status: { in: ["PENDING", "PARTIALLY_PAID"] },
//     },
//     include: {
//       loan: {
//         select: {
//           id: true,
//           loanNumber: true,
//           userId: true,
//           outstandingAmount: true,
//         },
//       },
//     },
//   });

//   console.log(`[JOB reminders] found ${schedules.length} due schedules`);

//   let sent = 0;
//   for (const schedule of schedules) {
//     try {
//       await notifyUser(
//         schedule.loan.userId,
//         "REPAYMENT_DUE",
//         "Loan repayment reminder",
//         `Your loan ${schedule.loan.loanNumber} repayment is due in 5 days.`,
//         {
//           loanId: schedule.loan.id,
//           scheduleId: schedule.id,
//           dueDate: schedule.dueDate,
//         },
//       );
//       sent++;
//     } catch (err) {
//       console.error(`[JOB reminders] failed for schedule ${schedule.id}:`, err);
//     }
//   }

//   console.log(`[JOB reminders] done — sent=${sent}`);
//   return { sent };
// }

// export async function runRepaymentRemindersJob() {
//   console.log("[JOB] Checking repayment reminders...");

//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() + 5);
//   startDate.setHours(0, 0, 0, 0);

//   const endDate = new Date(startDate);
//   endDate.setHours(23, 59, 59, 999);

//   const schedules = await prisma.repaymentSchedule.findMany({
//     where: {
//       dueDate: { gte: startDate, lte: endDate },
//       outstandingAmount: { gt: 0 },
//       status: { in: ["PENDING", "PARTIALLY_PAID"] },
//     },
//     include: {
//       loan: {
//         select: {
//           id: true,
//           loanNumber: true,
//           userId: true,
//           outstandingAmount: true,
//         },
//       },
//     },
//   });

//   for (const schedule of schedules) {
//     await notifyUser(
//       schedule.loan.userId,
//       "REPAYMENT_DUE",
//       "Loan repayment reminder",
//       `Your loan ${schedule.loan.loanNumber} repayment is due in 5 days.`,
//       {
//         loanId: schedule.loan.id,
//         scheduleId: schedule.id,
//         dueDate: schedule.dueDate,
//       },
//     );
//   }

//   console.log(`[JOB] ${schedules.length} repayment reminders created`);
//   return { sent: schedules.length };
// }

/* ============================================================
 * Local dev only — schedule via node-cron.
 *
 * On Vercel this isn't called; the ops console and the external
 * cron trigger jobs over HTTP instead.
 * ============================================================ */
export function startLoanJobs() {
  cron.schedule("0 * * * *", async () => {
    await runOverdueSchedulesJob();
    await runLoanOverdueJob();
  });

  cron.schedule("0 9 * * *", async () => {
    await runRepaymentRemindersJob();
  });

  console.log("Loan background jobs started (node-cron)");
}

// import cron from "node-cron";

// import { prisma } from "../config/prisma.js";

// import {
//   notifyUser,
// } from "../services/notification.service.js";

// import {
//   updateOverdueSchedules,
// } from "../services/repaymentSchedule.service.js";

// /*
//  * Update overdue loans
//  *
//  * Runs every hour.
//  */
// async function updateOverdueLoansJob() {
//   try {
//     console.log(
//       "[JOB] Checking overdue loans...",
//     );

//     const now = new Date();

//     const loans =
//       await prisma.loan.findMany({
//         where: {
//           status: {
//             in: [
//               "ACTIVE",
//               "PARTIALLY_PAID",
//             ],
//           },

//           maturityDate: {
//             lt: now,
//           },

//           outstandingAmount: {
//             gt: 0,
//           },
//         },
//       });

//     for (const loan of loans) {
//       await prisma.loan.update({
//         where: {
//           id: loan.id,
//         },

//         data: {
//           status: "OVERDUE",
//         },
//       });

//       await notifyUser(
//         loan.userId,
//         "REPAYMENT_OVERDUE",
//         "Loan repayment overdue",
//         `Your loan ${loan.loanNumber} has passed its repayment date and still has an outstanding balance.`,
//         {
//           loanId: loan.id,
//           loanNumber: loan.loanNumber,
//         },
//       );
//     }

//     console.log(
//       `[JOB] ${loans.length} overdue loans updated`,
//     );
//   } catch (error) {
//     console.error(
//       "[JOB] Failed to update overdue loans:",
//       error,
//     );
//   }
// }

// /*
//  * Update overdue repayment schedules
//  */
// async function updateOverdueSchedulesJob() {
//   try {
//     console.log(
//       "[JOB] Checking overdue repayment schedules...",
//     );

//     const result =
//       await updateOverdueSchedules();

//     console.log(
//       "[JOB] Repayment schedules updated:",
//       result,
//     );
//   } catch (error) {
//     console.error(
//       "[JOB] Failed to update repayment schedules:",
//       error,
//     );
//   }
// }

// /*
//  * Send repayment reminders
//  *
//  * Runs every day at 9:00 AM.
//  *
//  * It looks for repayment schedules that
//  * are due exactly 5 days from today.
//  */
// async function sendRepaymentRemindersJob() {
//   try {
//     console.log(
//       "[JOB] Checking repayment reminders...",
//     );

//     const now = new Date();

//     const startDate = new Date(now);

//     startDate.setDate(
//       startDate.getDate() + 5,
//     );

//     startDate.setHours(0, 0, 0, 0);

//     const endDate = new Date(startDate);

//     endDate.setHours(23, 59, 59, 999);

//     const schedules =
//       await prisma.repaymentSchedule.findMany({
//         where: {
//           dueDate: {
//             gte: startDate,
//             lte: endDate,
//           },

//           outstandingAmount: {
//             gt: 0,
//           },

//           status: {
//             in: [
//               "PENDING",
//               "PARTIALLY_PAID",
//             ],
//           },
//         },

//         include: {
//           loan: {
//             select: {
//               id: true,
//               loanNumber: true,
//               userId: true,
//               outstandingAmount: true,
//             },
//           },
//         },
//       });

//     for (const schedule of schedules) {
//       await notifyUser(
//         schedule.loan.userId,
//         "REPAYMENT_DUE",
//         "Loan repayment reminder",
//         `Your loan ${schedule.loan.loanNumber} repayment is due in 5 days.`,
//         {
//           loanId: schedule.loan.id,
//           scheduleId: schedule.id,
//           dueDate: schedule.dueDate,
//         },
//       );
//     }

//     console.log(
//       `[JOB] ${schedules.length} repayment reminders created`,
//     );
//   } catch (error) {
//     console.error(
//       "[JOB] Failed to send repayment reminders:",
//       error,
//     );
//   }
// }

// /*
//  * Start all background jobs.
//  */
// export function startLoanJobs() {
//   /*
//    * Every hour
//    */
//   cron.schedule(
//     "0 * * * *",
//     async () => {
//       await updateOverdueSchedulesJob();
//       await updateOverdueLoansJob();
//     },
//   );

//   /*
//    * Every day at 9:00 AM
//    */
//   cron.schedule(
//     "0 9 * * *",
//     async () => {
//       await sendRepaymentRemindersJob();
//     },
//   );

//   console.log(
//     "Loan background jobs started",
//   );
// }