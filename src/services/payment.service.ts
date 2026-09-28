
import type {
  CreatePaymentInput,
} from "../schemas/payment.schema.js";

import type {
  Role,
} from "../generated/prisma/enums.js";

import { randomBytes } from "crypto";
import { prisma } from "../config/prisma.js";


/*
 * ============================================================
 * PAYMENT SERVICE
 * ============================================================
 */


/*
 * Staff roles.
 *
 * These are strings because Prisma 7 generates the
 * enum as a type in this project.
 */
const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE_OFFICER",
  "LOAN_OFFICER",
  "SUPPORT",
];


/*
 * ============================================================
 * GENERATE PAYMENT REFERENCE
 * ============================================================
 */

const generatePaymentReference =
  async (): Promise<string> => {

    let reference = "";

    let exists = true;

    while (exists) {

      const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const random =
        randomBytes(3)
          .toString("hex")
          .toUpperCase();

      reference =
        `PAY-${date}-${random}`;


      const existing =
        await prisma.payment.findUnique({
          where: {
            paymentReference: reference,
          },
        });


      exists = !!existing;
    }


    return reference;
  };


/*
 * ============================================================
 * GENERATE TRANSACTION NUMBER
 * ============================================================
 */

const generateTransactionNumber =
  async (): Promise<string> => {

    let transactionNumber = "";

    let exists = true;


    while (exists) {

      const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const random =
        randomBytes(3)
          .toString("hex")
          .toUpperCase();


      transactionNumber =
        `TXN-${date}-${random}`;


      const existing =
        await prisma.loanTransaction.findUnique({
          where: {
            transactionNumber,
          },
        });


      exists = !!existing;
    }


    return transactionNumber;
  };


/*
 * ============================================================
 * RECORD PAYMENT
 * ============================================================
 */

export const createPayment = async (
  userId: string,
  input: CreatePaymentInput,
) => {

  /*
   * ----------------------------------------------------------
   * FIND USER
   * ----------------------------------------------------------
   */

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });


  if (!user) {
    throw new Error("User not found");
  }


  /*
   * ----------------------------------------------------------
   * FIND REPAYMENT SCHEDULE
   * ----------------------------------------------------------
   */

  let schedule;


  /*
   * If the customer supplied a schedule ID,
   * use that specific schedule.
   */

  if (input.scheduleId) {

    schedule =
      await prisma.repaymentSchedule.findUnique({

        where: {
          id: input.scheduleId,
        },

        include: {
          loan: true,
        },
      });

  } else {

    /*
     * Otherwise find the customer's earliest
     * outstanding repayment.
     */

    schedule =
      await prisma.repaymentSchedule.findFirst({

        where: {

          loan: {
            userId,
          },

          status: {
            in: [
              "PENDING",
              "PARTIALLY_PAID",
              "OVERDUE",
            ],
          },

          outstandingAmount: {
            gt: 0,
          },
        },

        include: {
          loan: true,
        },

        orderBy: {
          dueDate: "asc",
        },
      });
  }


  /*
   * ----------------------------------------------------------
   * CHECK SCHEDULE
   * ----------------------------------------------------------
   */

  if (!schedule) {

    throw new Error(
      "No outstanding repayment schedule found",
    );
  }


  /*
   * ----------------------------------------------------------
   * CHECK OWNERSHIP
   * ----------------------------------------------------------
   */

  const isStaff =
    STAFF_ROLES.includes(
      user.role,
    );


  if (
    !isStaff &&
    schedule.loan.userId !== userId
  ) {

    throw new Error(
      "You are not authorized to make a payment for this loan",
    );
  }


  /*
   * ----------------------------------------------------------
   * CHECK LOAN STATUS
   * ----------------------------------------------------------
   */

  if (
    schedule.loan.status !== "ACTIVE" &&
    schedule.loan.status !== "PARTIALLY_PAID" &&
    schedule.loan.status !== "OVERDUE"
  ) {

    throw new Error(
      "Payment cannot be made for this loan",
    );
  }


  /*
   * ----------------------------------------------------------
   * PREVENT OVERPAYMENT
   * ----------------------------------------------------------
   */

  if (
    schedule.outstandingAmount.lt(
      input.amount,
    )
  ) {

    throw new Error(
      "Payment amount cannot be greater than the outstanding amount",
    );
  }


  /*
   * ----------------------------------------------------------
   * GENERATE REFERENCES
   * ----------------------------------------------------------
   */

  const paymentReference =
    await generatePaymentReference();


  const transactionNumber =
    await generateTransactionNumber();


  /*
   * ----------------------------------------------------------
   * CALCULATE NEW SCHEDULE BALANCE
   * ----------------------------------------------------------
   */

  const newScheduleAmountPaid =
    schedule.amountPaid.add(
      input.amount,
    );


  const newScheduleOutstanding =
    schedule.outstandingAmount.sub(
      input.amount,
    );


  /*
   * ----------------------------------------------------------
   * CALCULATE NEW LOAN BALANCE
   * ----------------------------------------------------------
   */

  const newLoanAmountPaid =
    schedule.loan.amountPaid.add(
      input.amount,
    );


  const newLoanOutstanding =
    schedule.loan.outstandingAmount.sub(
      input.amount,
    );


  /*
   * ----------------------------------------------------------
   * DETERMINE SCHEDULE STATUS
   * ----------------------------------------------------------
   */

  let scheduleStatus:
    | "PARTIALLY_PAID"
    | "PAID";


  if (
    newScheduleOutstanding.eq(0)
  ) {

    scheduleStatus =
      "PAID";

  } else {

    scheduleStatus =
      "PARTIALLY_PAID";
  }


  /*
   * ----------------------------------------------------------
   * DETERMINE LOAN STATUS
   * ----------------------------------------------------------
   */

  let loanStatus:
    | "ACTIVE"
    | "PARTIALLY_PAID"
    | "FULLY_PAID";


  if (
    newLoanOutstanding.eq(0)
  ) {

    loanStatus =
      "FULLY_PAID";

  } else if (
    newLoanAmountPaid.gt(0)
  ) {

    loanStatus =
      "PARTIALLY_PAID";

  } else {

    loanStatus =
      "ACTIVE";
  }


  /*
   * ----------------------------------------------------------
   * DATABASE TRANSACTION
   * ----------------------------------------------------------
   *
   * Payment
   * Schedule
   * Loan
   * Transaction
   *
   * are all updated together.
   */

  const result =
    await prisma.$transaction(
      async (tx) => {

        /*
         * ----------------------------------------------------
         * CREATE PAYMENT
         * ----------------------------------------------------
         */

        const payment =
          await tx.payment.create({

            data: {

              paymentReference,

              loanId:
                schedule.loanId,

              scheduleId:
                schedule.id,

              amount:
                input.amount,

              paymentMethod:
                input.paymentMethod,

              transactionReference:
                input.transactionReference,

              status:
                "COMPLETED",

              paymentDate:
                new Date(),

              processedAt:
                new Date(),

              metadata:
                input.metadata,
            },
          });


        /*
         * ----------------------------------------------------
         * UPDATE REPAYMENT SCHEDULE
         * ----------------------------------------------------
         */

        const updatedSchedule =
          await tx.repaymentSchedule.update({

            where: {
              id: schedule.id,
            },

            data: {

              amountPaid:
                newScheduleAmountPaid,

              outstandingAmount:
                newScheduleOutstanding,

              status:
                scheduleStatus,

              paidAt:
                scheduleStatus === "PAID"
                  ? new Date()
                  : null,
            },
          });


        /*
         * ----------------------------------------------------
         * UPDATE LOAN
         * ----------------------------------------------------
         */

        const updatedLoan =
          await tx.loan.update({

            where: {
              id: schedule.loanId,
            },

            data: {

              amountPaid:
                newLoanAmountPaid,

              outstandingAmount:
                newLoanOutstanding,

              status:
                loanStatus,
            },
          });


        /*
         * ----------------------------------------------------
         * CREATE LOAN TRANSACTION
         * ----------------------------------------------------
         */

        const transaction =
          await tx.loanTransaction.create({

            data: {

              transactionNumber,

              loanId:
                schedule.loanId,

              paymentId:
                payment.id,

              type:
                "REPAYMENT",

              amount:
                input.amount,

              description:
                "Loan repayment",

              reference:
                input.transactionReference ??
                paymentReference,

              balanceBefore:
                schedule.loan.outstandingAmount,

              balanceAfter:
                newLoanOutstanding,
            },
          });


        return {
          payment,
          schedule: updatedSchedule,
          loan: updatedLoan,
          transaction,
        };
      },
    );


  return result;
};


/*
 * ============================================================
 * GET PAYMENT BY ID
 * ============================================================
 */

export const getPaymentById = async (
  paymentId: string,
  userId: string,
) => {

  const payment =
    await prisma.payment.findUnique({

      where: {
        id: paymentId,
      },

      include: {

        loan: {
          select: {

            id: true,

            loanNumber: true,

            userId: true,

            status: true,

            principalAmount: true,

            totalAmount: true,

            amountPaid: true,

            outstandingAmount: true,
          },
        },

        schedule: true,

        transactions: true,
      },
    });


  if (!payment) {
    throw new Error("Payment not found");
  }


  const user =
    await prisma.user.findUnique({

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


  const isStaff =
    STAFF_ROLES.includes(
      user.role,
    );


  if (
    !isStaff &&
    payment.loan.userId !== userId
  ) {

    throw new Error(
      "You are not authorized to view this payment",
    );
  }


  return payment;
};


/*
 * ============================================================
 * GET MY PAYMENTS
 * ============================================================
 */

export const getMyPayments = async (
  userId: string,
) => {

  return prisma.payment.findMany({

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

          status: true,
        },
      },

      schedule: {

        select: {

          id: true,

          installmentNumber: true,

          dueDate: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};


/*
 * ============================================================
 * GET PAYMENTS FOR A LOAN
 * ============================================================
 */

export const getLoanPayments = async (
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

        userId: true,
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


  const isStaff =
    STAFF_ROLES.includes(
      user.role,
    );


  if (
    !isStaff &&
    loan.userId !== userId
  ) {

    throw new Error(
      "You are not authorized to view these payments",
    );
  }


  return prisma.payment.findMany({

    where: {
      loanId,
    },

    include: {

      schedule: true,

      transactions: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};