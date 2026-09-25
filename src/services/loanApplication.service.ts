import { prisma } from "../config/prisma.js";
import {
  CreateLoanApplicationInput,
  LoanApplicationQueryInput,
  CancelLoanApplicationInput,
  AdminLoanApplicationQueryInput,
  ReviewLoanApplicationInput,
} from "../schemas/loanApplication.schema.js";


/*
 * ============================================================
 * SYSTEM CONFIG HELPER
 * ============================================================
 */

async function getConfig(key: string) {
  return prisma.systemConfig.findUnique({
    where: {
      key,
    },
  });
}


async function getNumericConfig(
  key: string,
  fallback: number,
) {
  const config = await getConfig(key);

  if (!config) {
    return fallback;
  }

  const value = Number(config.value);

  return Number.isFinite(value)
    ? value
    : fallback;
}


/*
 * ============================================================
 * APPLICATION NUMBER
 * ============================================================
 */

function generateApplicationNumber(): string {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000,
  );

  return `APP-${timestamp}-${random}`;
}


/*
 * ============================================================
 * CREATE LOAN APPLICATION
 * ============================================================
 */

export async function createLoanApplication(
  userId: string,
  data: CreateLoanApplicationInput,
) {

  /*
   * ----------------------------------------------------------
   * 1. Verify KYC
   * ----------------------------------------------------------
   */

  const kyc = await prisma.kyc.findUnique({
    where: {
      userId,
    },
  });

  if (!kyc) {
    throw new Error(
      "KYC is required before applying for a loan",
    );
  }

  if (kyc.status !== "APPROVED") {
    throw new Error(
      "Your KYC must be approved before applying for a loan",
    );
  }


  /*
   * ----------------------------------------------------------
   * 2. Get loan product
   * ----------------------------------------------------------
   */

  const loanProduct =
    await prisma.loanProduct.findUnique({
      where: {
        id: data.loanProductId,
      },
    });

  if (!loanProduct) {
    throw new Error(
      "Loan product not found",
    );
  }

  if (!loanProduct.isActive) {
    throw new Error(
      "This loan product is currently unavailable",
    );
  }


  /*
   * ----------------------------------------------------------
   * 3. System configuration
   * ----------------------------------------------------------
   */

  const systemMinAmount =
    await getNumericConfig(
      "MIN_LOAN_AMOUNT",
      0,
    );

  const systemMaxAmount =
    await getNumericConfig(
      "MAX_LOAN_AMOUNT",
      Number.MAX_SAFE_INTEGER,
    );

  const systemMinDays =
    await getNumericConfig(
      "MIN_REPAYMENT_DAYS",
      1,
    );

  const systemMaxDays =
    await getNumericConfig(
      "MAX_REPAYMENT_DAYS",
      Number.MAX_SAFE_INTEGER,
    );


  /*
   * ----------------------------------------------------------
   * 4. Validate amount
   * ----------------------------------------------------------
   */

  const minAmount = Math.max(
    systemMinAmount,
    Number(loanProduct.minAmount),
  );

  const maxAmount = Math.min(
    systemMaxAmount,
    Number(loanProduct.maxAmount),
  );

  if (
    data.requestedAmount < minAmount
  ) {
    throw new Error(
      `Minimum loan amount is ${minAmount}`,
    );
  }

  if (
    data.requestedAmount > maxAmount
  ) {
    throw new Error(
      `Maximum loan amount is ${maxAmount}`,
    );
  }


  /*
   * ----------------------------------------------------------
   * 5. Validate repayment period
   * ----------------------------------------------------------
   */

  const minDays = Math.max(
    systemMinDays,
    loanProduct.minRepaymentDays,
  );

  const maxDays = Math.min(
    systemMaxDays,
    loanProduct.maxRepaymentDays,
  );

  if (
    data.requestedDays < minDays
  ) {
    throw new Error(
      `Minimum repayment period is ${minDays} days`,
    );
  }

  if (
    data.requestedDays > maxDays
  ) {
    throw new Error(
      `Maximum repayment period is ${maxDays} days`,
    );
  }


  /*
   * ----------------------------------------------------------
   * 6. Check existing active loan
   * ----------------------------------------------------------
   */

  const activeLoan =
    await prisma.loan.findFirst({
      where: {
        userId,

        status: {
          in: [
            "ACTIVE",
            "PARTIALLY_PAID",
            "OVERDUE",
            "DEFAULTED",
          ],
        },
      },
    });

  if (activeLoan) {
    throw new Error(
      "You already have an active loan",
    );
  }


  /*
   * ----------------------------------------------------------
   * 7. Prevent duplicate pending applications
   * ----------------------------------------------------------
   */

  const pendingApplication =
    await prisma.loanApplication.findFirst({
      where: {
        userId,

        status: {
          in: [
            "SUBMITTED",
            "UNDER_REVIEW",
            "DOCUMENTS_REQUIRED",
            "PENDING_APPROVAL",
          ],
        },
      },
    });

  if (pendingApplication) {
    throw new Error(
      "You already have a loan application under review",
    );
  }


  /*
   * ----------------------------------------------------------
   * 8. Get interest rate
   * ----------------------------------------------------------
   */

  const interestRate =
    Number(loanProduct.interestRate);


  /*
   * ----------------------------------------------------------
   * 9. Processing fee
   * ----------------------------------------------------------
   */

  const processingFee =
    Number(
      loanProduct.processingFee ?? 0,
    );


  /*
   * ----------------------------------------------------------
   * 10. Create application
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * LoanApplication does NOT contain:
   *
   * - interestAmount
   * - totalRepayment
   * - approvedAmount
   * - approvedRepaymentDays
   * - approvedInterestRate
   *
   * Those belong to the loan/approval stage.
   */

  const application =
    await prisma.loanApplication.create({
      data: {
        applicationNumber:
          generateApplicationNumber(),

        userId,

        loanProductId:
          data.loanProductId,

        requestedAmount:
          data.requestedAmount,

        requestedDays:
          data.requestedDays,

        interestRate,

        processingFee,

        purpose:
          data.purpose ?? null,

        description:
          data.description ?? null,

        status: "SUBMITTED",

        submittedAt:
          new Date(),
      },

      include: {
        loanProduct: true,
      },
    });

  return application;
}


/*
 * ============================================================
 * CUSTOMER APPLICATIONS
 * ============================================================
 */

export async function getCustomerLoanApplications(
  userId: string,
  query: LoanApplicationQueryInput,
) {
  const {
    page,
    limit,
    status,
    sortBy,
    sortOrder,
  } = query;

  const where = {
    userId,

    ...(status && {
      status,
    }),
  };

  const [
    items,
    total,
  ] = await prisma.$transaction([
    prisma.loanApplication.findMany({
      where,

      skip:
        (page - 1) * limit,

      take:
        limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      include: {
        loanProduct: true,
      },
    }),

    prisma.loanApplication.count({
      where,
    }),
  ]);

  return {
    items,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(
          total / limit,
        ),
    },
  };
}


/*
 * ============================================================
 * GET CUSTOMER APPLICATION
 * ============================================================
 */

export async function getCustomerLoanApplication(
  userId: string,
  id: string,
) {
  return prisma.loanApplication.findFirst({
    where: {
      id,
      userId,
    },

    include: {
      loanProduct: true,

      approvals: {
        orderBy: {
          createdAt: "desc",
        },

        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },

      documents: true,

      guarantors: true,

      collateral: true,
    },
  });
}


/*
 * ============================================================
 * CANCEL APPLICATION
 * ============================================================
 */

export async function cancelLoanApplication(
  userId: string,
  id: string,
  data: CancelLoanApplicationInput,
) {
  const application =
    await prisma.loanApplication.findFirst({
      where: {
        id,
        userId,
      },
    });

  if (!application) {
    throw new Error(
      "Loan application not found",
    );
  }

  if (
    ![
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "DOCUMENTS_REQUIRED",
    ].includes(application.status)
  ) {
    throw new Error(
      "This loan application cannot be cancelled",
    );
  }

  return prisma.$transaction(
    async (tx) => {

      const updated =
        await tx.loanApplication.update({
          where: {
            id,
          },

          data: {
            status: "CANCELLED",
          },

          include: {
            loanProduct: true,
          },
        });


      /*
       * Record cancellation in approval history.
       */

      await tx.loanApproval.create({
        data: {
          applicationId: id,

          approverId: userId,

          action: "CANCEL",

          comments:
            data.reason ??
            "Application cancelled by customer",
        },
      });

      return updated;
    },
  );
}


/*
 * ============================================================
 * ADMIN APPLICATION LIST
 * ============================================================
 */

export async function getAdminLoanApplications(
  query: AdminLoanApplicationQueryInput,
) {
  const {
    page,
    limit,
    status,
    loanProductId,
    userId,
    search,
    sortBy,
    sortOrder,
  } = query;


  const where: any = {
    ...(status && {
      status,
    }),

    ...(loanProductId && {
      loanProductId,
    }),

    ...(userId && {
      userId,
    }),

    ...(search && {
      OR: [
        {
          id: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          applicationNumber: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          user: {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    }),
  };


  const [
    items,
    total,
  ] = await prisma.$transaction([
    prisma.loanApplication.findMany({
      where,

      skip:
        (page - 1) * limit,

      take:
        limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },

        loanProduct: true,
      },
    }),

    prisma.loanApplication.count({
      where,
    }),
  ]);


  return {
    items,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(
          total / limit,
        ),
    },
  };
}


/*
 * ============================================================
 * ADMIN APPLICATION DETAILS
 * ============================================================
 */

export async function getAdminLoanApplication(
  id: string,
) {
  return prisma.loanApplication.findUnique({
    where: {
      id,
    },

    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true,
          dateOfBirth: true,
          gender: true,
          employmentType: true,
          employerName: true,
          monthlyIncome: true,
        },
      },

      loanProduct: true,

      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },

      documents: true,

      guarantors: true,

      collateral: true,

      loan: true,
    },
  });
}


/*
 * ============================================================
 * ADMIN REVIEW
 * ============================================================
 */

export async function reviewLoanApplication(
  applicationId: string,
  reviewerId: string,
  data: ReviewLoanApplicationInput,
) {
  const application =
    await prisma.loanApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

  if (!application) {
    throw new Error(
      "Loan application not found",
    );
  }


  /*
   * Finalized applications cannot be reviewed again.
   */

  if (
    [
      "CANCELLED",
      "REJECTED",
      "APPROVED",
      "DISBURSED",
    ].includes(application.status)
  ) {
    throw new Error(
      "This application has already been finalized",
    );
  }


  /*
   * Map review action to application status.
   */

  let newStatus:
    | "UNDER_REVIEW"
    | "DOCUMENTS_REQUIRED"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED";

  switch (data.action) {

    case "REVIEW":
      newStatus = "UNDER_REVIEW";
      break;

    case "REQUEST_DOCUMENTS":
      newStatus = "DOCUMENTS_REQUIRED";
      break;

    case "APPROVE":
      newStatus = "APPROVED";
      break;

    case "REJECT":
      newStatus = "REJECTED";
      break;

    default:
      throw new Error(
        "Invalid review action",
      );
  }


  return prisma.$transaction(
    async (tx) => {

      const now = new Date();


      /*
       * Update application.
       */

      const updated =
        await tx.loanApplication.update({
          where: {
            id: applicationId,
          },

          data: {
            status: newStatus,

            reviewedAt:
              newStatus === "UNDER_REVIEW"
                ? now
                : application.reviewedAt,

            approvedAt:
              newStatus === "APPROVED"
                ? now
                : application.approvedAt,

            rejectedAt:
              newStatus === "REJECTED"
                ? now
                : application.rejectedAt,

            rejectionReason:
              newStatus === "REJECTED"
                ? data.comments ?? null
                : application.rejectionReason,
          },

          include: {
            loanProduct: true,
          },
        });


      /*
       * Record approval/review history.
       */

      const approval =
        await tx.loanApproval.create({
          data: {
            applicationId,

            approverId:
              reviewerId,

            action:
              data.action,

            comments:
              data.comments ?? null,
          },
        });


      return {
        application: updated,
        approval,
      };
    },
  );
}