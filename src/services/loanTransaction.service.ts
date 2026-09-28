import { prisma } from "../config/prisma.js";
import {
  Role,
} from "../generated/prisma/enums.js";



/*
 * ============================================================
 * LOAN TRANSACTION SERVICE
 * ============================================================
 */


/*
 * ============================================================
 * GET TRANSACTION BY ID
 * ============================================================
 */

export const getLoanTransactionById =
  async (
    transactionId: string,
    userId: string,
  ) => {

    const transaction =
      await prisma.loanTransaction.findUnique({

        where: {
          id: transactionId,
        },

        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              userId: true,
              status: true,
            },
          },

          payment: {
            select: {
              id: true,
              paymentReference: true,
              amount: true,
              paymentMethod: true,
              status: true,
              transactionReference: true,
              paymentDate: true,
            },
          },
        },
      });


    if (!transaction) {
      throw new Error(
        "Loan transaction not found",
      );
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
      transaction.loan.userId !== userId
    ) {
      throw new Error(
        "You are not authorized to view this transaction",
      );
    }


    return transaction;
  };


/*
 * ============================================================
 * GET ALL TRANSACTIONS FOR A LOAN
 * ============================================================
 */

export const getLoanTransactions =
  async (
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
        "You are not authorized to view these transactions",
      );
    }


    return prisma.loanTransaction.findMany({

      where: {
        loanId,
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

      orderBy: {
        createdAt: "desc",
      },
    });
  };


/*
 * ============================================================
 * GET MY LOAN TRANSACTIONS
 * ============================================================
 */

export const getMyLoanTransactions =
  async (
    userId: string,
  ) => {

    return prisma.loanTransaction.findMany({

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

        payment: {
          select: {
            paymentReference: true,
            amount: true,
            paymentMethod: true,
            transactionReference: true,
            status: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };