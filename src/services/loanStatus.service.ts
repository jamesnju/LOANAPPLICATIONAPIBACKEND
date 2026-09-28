import { prisma } from "../config/prisma.js";
import {
  LoanStatus,
  RepaymentStatus,
  Role,
} from "../generated/prisma/enums.js";



/*
 * ============================================================
 * LOAN STATUS SERVICE
 * ============================================================
 */


/*
 * ============================================================
 * GET LOAN STATUS
 * ============================================================
 */

export const getLoanStatus = async (
  loanId: string,
  userId: string,
) => {

  const loan =
    await prisma.loan.findUnique({

      where: {
        id: loanId,
      },

      select: {
        id: true,
        loanNumber: true,
        userId: true,
        status: true,
        principalAmount: true,
        totalAmount: true,
        amountPaid: true,
        outstandingAmount: true,
        disbursedAt: true,
        maturityDate: true,

        repaymentSchedules: {
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            totalAmount: true,
            amountPaid: true,
            outstandingAmount: true,
            status: true,
          },

          orderBy: {
            installmentNumber: "asc",
          },
        },
      },
    });


  if (!loan) {
    throw new Error("Loan not found");
  }


  const user =
    await prisma.user.findUnique({

      where: {
        id: userId,
      },

      select: {
        role: true,
      },
    });


  if (!user) {
    throw new Error("User not found");
  }


  const staffRoles: Role[] = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.FINANCE_OFFICER,
    Role.LOAN_OFFICER,
    Role.SUPPORT,
  ];


  const isStaff =
    staffRoles.includes(user.role);


  if (
    !isStaff &&
    loan.userId !== userId
  ) {
    throw new Error(
      "You are not authorized to view this loan status",
    );
  }


  return loan;
};


/*
 * ============================================================
 * UPDATE SINGLE LOAN STATUS
 * ============================================================
 *
 * This checks:
 *
 * - outstanding balance
 * - maturity date
 * - repayment schedule
 *
 * and updates the appropriate status.
 */

export const updateLoanStatus = async (
  loanId: string,
) => {

  const loan =
    await prisma.loan.findUnique({

      where: {
        id: loanId,
      },

      include: {
        repaymentSchedules: true,
      },
    });


  if (!loan) {
    throw new Error("Loan not found");
  }


  /*
   * Fully paid loans should remain fully paid.
   */

  if (
    loan.outstandingAmount.eq(0)
  ) {

    return prisma.loan.update({

      where: {
        id: loanId,
      },

      data: {
        status: LoanStatus.FULLY_PAID,
      },
    });
  }


  /*
   * Only active/partially paid/overdue loans
   * need this status evaluation.
   */

  if (
    loan.status ===
      LoanStatus.CANCELLED ||
    loan.status ===
      LoanStatus.DEFAULTED ||
    loan.status ===
      LoanStatus.WRITTEN_OFF
  ) {

    return loan;
  }


  const now = new Date();


  /*
   * Check whether any repayment schedule is overdue.
   */

  const hasOverdueSchedule =
    loan.repaymentSchedules.some(
      (schedule) =>
        schedule.outstandingAmount.gt(0) &&
        schedule.dueDate < now &&
        (
          schedule.status ===
            RepaymentStatus.PENDING ||
          schedule.status ===
            RepaymentStatus.PARTIALLY_PAID ||
          schedule.status ===
            RepaymentStatus.OVERDUE
        ),
    );


  /*
   * If overdue, update both:
   *
   * Loan
   * Repayment Schedule
   */

  if (hasOverdueSchedule) {

    await prisma.$transaction(
      async (tx) => {

        await tx.repaymentSchedule.updateMany({
          where: {
            loanId,
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

          data: {
            status:
              RepaymentStatus.OVERDUE,
          },
        });


        await tx.loan.update({

          where: {
            id: loanId,
          },

          data: {
            status:
              LoanStatus.OVERDUE,
          },
        });
      },
    );


    return prisma.loan.findUnique({
      where: {
        id: loanId,
      },

      include: {
        repaymentSchedules: true,
      },
    });
  }


  /*
   * If the loan still has money outstanding
   * and is not overdue, determine whether it
   * has received a partial payment.
   */

  if (
    loan.amountPaid.gt(0) &&
    loan.outstandingAmount.gt(0)
  ) {

    return prisma.loan.update({

      where: {
        id: loanId,
      },

      data: {
        status:
          LoanStatus.PARTIALLY_PAID,
      },
    });
  }


  /*
   * Otherwise it is active.
   */

  return prisma.loan.update({

    where: {
      id: loanId,
    },

    data: {
      status: LoanStatus.ACTIVE,
    },
  });
};


/*
 * ============================================================
 * UPDATE ALL OVERDUE LOANS
 * ============================================================
 *
 * This will later be called by a background job.
 */

export const updateAllOverdueLoans = async () => {

  const now = new Date();


  /*
   * Find repayment schedules that have passed
   * their due dates.
   */

  const schedules =
    await prisma.repaymentSchedule.findMany({

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

      select: {
        id: true,
        loanId: true,
      },
    });


  /*
   * If there are no overdue schedules,
   * there is nothing to update.
   */

  if (schedules.length === 0) {

    return {
      updatedSchedules: 0,
      updatedLoans: 0,
    };
  }


  const loanIds =
    [
      ...new Set(
        schedules.map(
          (schedule) =>
            schedule.loanId,
        ),
      ),
    ];


  /*
   * Update repayment schedules.
   */

  await prisma.repaymentSchedule.updateMany({

    where: {
      id: {
        in: schedules.map(
          (schedule) =>
            schedule.id,
        ),
      },
    },

    data: {
      status:
        RepaymentStatus.OVERDUE,
    },
  });


  /*
   * Update loans.
   */

  await prisma.loan.updateMany({

    where: {
      id: {
        in: loanIds,
      },

      outstandingAmount: {
        gt: 0,
      },

      status: {
        in: [
          LoanStatus.ACTIVE,
          LoanStatus.PARTIALLY_PAID,
        ],
      },
    },

    data: {
      status:
        LoanStatus.OVERDUE,
    },
  });


  return {
    updatedSchedules:
      schedules.length,

    updatedLoans:
      loanIds.length,
  };
};