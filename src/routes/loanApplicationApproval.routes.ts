import { Router } from "express";

import {
  approveLoanApplicationController,
  getApprovalHistoryController,
  rejectLoanApplicationController,
  requestDocumentsController,
  reviewLoanApplicationController,
  submitForApprovalController,
} from "../controllers/loanApplicationApproval.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { Role } from "../generated/prisma/client.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

/*
 * ============================================================
 * REVIEW
 * ============================================================
 */

router.patch(
  "/:id/review",
  authenticate,
  authorize(
    Role.LOAN_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  reviewLoanApplicationController,
);

/*
 * ============================================================
 * REQUEST DOCUMENTS
 * ============================================================
 */

router.patch(
  "/:id/request-documents",
  authenticate,
  authorize(
    Role.LOAN_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  requestDocumentsController,
);

/*
 * ============================================================
 * SUBMIT FOR APPROVAL
 * ============================================================
 */

router.patch(
  "/:id/submit-for-approval",
  authenticate,
  authorize(
    Role.LOAN_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  submitForApprovalController,
);

/*
 * ============================================================
 * APPROVE
 * ============================================================
 */

router.patch(
  "/:id/approve",
  authenticate,
  authorize(
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  approveLoanApplicationController,
);

/*
 * ============================================================
 * REJECT
 * ============================================================
 */

router.patch(
  "/:id/reject",
  authenticate,
  authorize(
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  rejectLoanApplicationController,
);

/*
 * ============================================================
 * APPROVAL HISTORY
 * ============================================================
 */

router.get(
  "/:id/approvals",
  authenticate,
  authorize(
    Role.LOAN_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  getApprovalHistoryController,
);

export default router;