import { Router } from "express";

import {
  createLoanController,
  disburseLoanController,
  getAdminLoansController,
  getLoanController,
  getLoanTransactionsController,
  getMyLoansController,
  uploadIdPhotoController,
} from "../controllers/loan.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { Role } from "../generated/prisma/client.js";
import { authorize } from "../middleware/role.middleware.js";
import { idPhotoUpload } from "../middleware/documentUpload.middleware.js";

const router = Router();

/*
 * ============================================================
 * CUSTOMER - MY LOANS
 * ============================================================
 *
 * GET /api/v1/loans/me
 */

router.get(
  "/me",
  authenticate,
  getMyLoansController,
);

/*
 * ============================================================
 * CREATE LOAN FROM APPROVED APPLICATION
 * ============================================================
 *
 * Only Finance/Admin should convert an approved application
 * into a loan.
 *
 * POST
 * /api/v1/loans/from-application/:applicationId
 */

router.post(
  "/from-application/:applicationId",
  authenticate,
  authorize(
    Role.FINANCE_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  createLoanController,
);

/*
 * ============================================================
 * DISBURSE LOAN
 * ============================================================
 *
 * POST
 * /api/v1/loans/:id/disburse
 */

router.post(
  "/:id/disburse",
  authenticate,
  authorize(
    Role.FINANCE_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  disburseLoanController,
);

/*
 * ============================================================
 * GET LOAN TRANSACTIONS
 * ============================================================
 *
 * GET
 * /api/v1/loans/:id/transactions
 */

router.get(
  "/:id/transactions",
  authenticate,
  getLoanTransactionsController,
);

/*
 * ============================================================
 * GET LOAN
 * ============================================================
 *
 * This comes after /me and the more specific routes above.
 *
 * GET
 * /api/v1/loans/:id
 */

router.get(
  "/:id",
  authenticate,
  getLoanController,
);

router.get(
  "/",
  authenticate,
  authorize(
    Role.FINANCE_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.LOAN_OFFICER,
  ),
  getAdminLoansController,
);
router.post(
  "/:id/id-photos",
  authenticate,
  idPhotoUpload.single("file"),
  uploadIdPhotoController
);
export default router;