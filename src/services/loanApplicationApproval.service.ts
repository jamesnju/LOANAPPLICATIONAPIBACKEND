import {
  ApplicationStatus,
  ApprovalAction,
  Role,
} from "../generated/prisma/client.js";

// IMPORTANT:
// Change this import to match the Prisma client location
// already used by your other services.
import { prisma } from "../config/prisma.js";

/*
 * ============================================================
 * REVIEW APPLICATION
 * ============================================================
 *
 * Flow:
 *
 * SUBMITTED
 *     ↓
 * UNDER_REVIEW
 *
 * The person who reviews the application becomes the MAKER.
 */

export async function reviewLoanApplication(
  applicationId: string,
  reviewerId: string,
  comments?: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
    include: {
      loanProduct: true,
      user: true,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  /*
   * Only submitted applications can enter review.
   */
  if (application.status !== ApplicationStatus.SUBMITTED) {
    throw new Error(
      `Application cannot be reviewed while in ${application.status} status`,
    );
  }

  /*
   * Make sure the reviewer exists.
   */
  const reviewer = await prisma.user.findUnique({
    where: {
      id: reviewerId,
    },
  });

  if (!reviewer) {
    throw new Error("Reviewer not found");
  }

  /*
   * Reviewer must have an appropriate role.
   */
  if (
    reviewer.role !== Role.LOAN_OFFICER &&
    reviewer.role !== Role.ADMIN &&
    reviewer.role !== Role.SUPER_ADMIN
  ) {
    throw new Error("You are not authorized to review loan applications");
  }

  const result = await prisma.$transaction(async (tx) => {
    /*
     * Update application status.
     */
    const updatedApplication = await tx.loanApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.UNDER_REVIEW,
        reviewedAt: new Date(),
      },
      include: {
        loanProduct: true,
        user: true,
      },
    });

    /*
     * Record maker action.
     */
    await tx.loanApproval.create({
      data: {
        applicationId,
        approverId: reviewerId,
        action: ApprovalAction.REVIEW,
        comments: comments ?? null,
      },
    });

    return updatedApplication;
  });

  return result;
}

/*
 * ============================================================
 * REQUEST ADDITIONAL DOCUMENTS
 * ============================================================
 *
 * UNDER_REVIEW
 *     ↓
 * DOCUMENTS_REQUIRED
 */

export async function requestLoanApplicationDocuments(
  applicationId: string,
  reviewerId: string,
  comments: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new Error(
      "Additional documents can only be requested while the application is under review",
    );
  }

  const reviewer = await prisma.user.findUnique({
    where: {
      id: reviewerId,
    },
  });

  if (!reviewer) {
    throw new Error("Reviewer not found");
  }

  if (
    reviewer.role !== Role.LOAN_OFFICER &&
    reviewer.role !== Role.ADMIN &&
    reviewer.role !== Role.SUPER_ADMIN
  ) {
    throw new Error(
      "You are not authorized to request additional documents",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.loanApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.DOCUMENTS_REQUIRED,
      },
      include: {
        loanProduct: true,
        user: true,
      },
    });

    await tx.loanApproval.create({
      data: {
        applicationId,
        approverId: reviewerId,
        action: ApprovalAction.REQUEST_DOCUMENTS,
        comments,
      },
    });

    return updatedApplication;
  });

  return result;
}

/*
 * ============================================================
 * APPROVE APPLICATION
 * ============================================================
 *
 * Maker-checker rule:
 *
 * REVIEWER ≠ APPROVER
 *
 * UNDER_REVIEW
 *     ↓
 * PENDING_APPROVAL
 *     ↓
 * APPROVED
 *
 * The actual Loan record will be created in the next module.
 */

export async function approveLoanApplication(
  applicationId: string,
  approverId: string,
  comments?: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
    include: {
      approvals: {
        orderBy: {
          createdAt: "desc",
        },
      },
      loanProduct: true,
      user: true,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  /*
   * Application must have completed review.
   */
  if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
    throw new Error(
      `Application cannot be approved while in ${application.status} status`,
    );
  }

  /*
   * Find the person who performed the review.
   */
  const reviewAction = application.approvals.find(
    (approval) => approval.action === ApprovalAction.REVIEW,
  );

  if (!reviewAction) {
    throw new Error(
      "Application cannot be approved because it has not been reviewed",
    );
  }

  /*
   * MAKER-CHECKER RULE
   *
   * The person who reviewed the application
   * cannot approve the same application.
   */
  if (reviewAction.approverId === approverId) {
    throw new Error(
      "Maker-checker violation: the reviewer cannot approve the same application",
    );
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver) {
    throw new Error("Approver not found");
  }

  /*
   * Only ADMIN and SUPER_ADMIN can approve.
   */
  if (
    approver.role !== Role.ADMIN &&
    approver.role !== Role.SUPER_ADMIN
  ) {
    throw new Error(
      "You are not authorized to approve loan applications",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.loanApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: {
        loanProduct: true,
        user: true,
      },
    });

    await tx.loanApproval.create({
      data: {
        applicationId,
        approverId,
        action: ApprovalAction.APPROVE,
        comments: comments ?? null,
      },
    });

    return updatedApplication;
  });

  return result;
}

/*
 * ============================================================
 * REJECT APPLICATION
 * ============================================================
 *
 * Only a different checker should reject after review.
 */

export async function rejectLoanApplication(
  applicationId: string,
  approverId: string,
  comments: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
    include: {
      approvals: {
        orderBy: {
          createdAt: "desc",
        },
      },
      loanProduct: true,
      user: true,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
    throw new Error(
      `Application cannot be rejected while in ${application.status} status`,
    );
  }

  const reviewAction = application.approvals.find(
    (approval) => approval.action === ApprovalAction.REVIEW,
  );

  if (!reviewAction) {
    throw new Error(
      "Application cannot be rejected because it has not been reviewed",
    );
  }

  /*
   * Maker-checker rule.
   */
  if (reviewAction.approverId === approverId) {
    throw new Error(
      "Maker-checker violation: the reviewer cannot reject the same application",
    );
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver) {
    throw new Error("Approver not found");
  }

  if (
    approver.role !== Role.ADMIN &&
    approver.role !== Role.SUPER_ADMIN
  ) {
    throw new Error(
      "You are not authorized to reject loan applications",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.loanApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: comments,
      },
      include: {
        loanProduct: true,
        user: true,
      },
    });

    await tx.loanApproval.create({
      data: {
        applicationId,
        approverId,
        action: ApprovalAction.REJECT,
        comments,
      },
    });

    return updatedApplication;
  });

  return result;
}

/*
 * ============================================================
 * MOVE APPLICATION TO PENDING APPROVAL
 * ============================================================
 *
 * Once the Loan Officer finishes reviewing the application,
 * it moves:
 *
 * UNDER_REVIEW → PENDING_APPROVAL
 *
 * This is separate from final approval.
 */

export async function submitForApproval(
  applicationId: string,
  reviewerId: string,
  comments?: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
    include: {
      approvals: true,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new Error(
      "Only applications under review can be submitted for approval",
    );
  }

  const reviewAction = application.approvals.find(
    (approval) => approval.action === ApprovalAction.REVIEW,
  );

  if (!reviewAction) {
    throw new Error("Application has not been reviewed");
  }

  /*
   * Only the reviewer should submit the application
   * for final approval.
   */
  if (reviewAction.approverId !== reviewerId) {
    throw new Error(
      "Only the officer who reviewed the application can submit it for approval",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.loanApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: ApplicationStatus.PENDING_APPROVAL,
      },
      include: {
        loanProduct: true,
        user: true,
      },
    });

    await tx.loanApproval.create({
      data: {
        applicationId,
        approverId: reviewerId,
        action: ApprovalAction.SUBMIT,
        comments: comments ?? null,
      },
    });

    return updatedApplication;
  });

  return result;
}

/*
 * ============================================================
 * GET APPROVAL HISTORY
 * ============================================================
 */

export async function getLoanApplicationApprovalHistory(
  applicationId: string,
) {
  const application = await prisma.loanApplication.findUnique({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new Error("Loan application not found");
  }

  const approvals = await prisma.loanApproval.findMany({
    where: {
      applicationId,
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      approver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return approvals;
}