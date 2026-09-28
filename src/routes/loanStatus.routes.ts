import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import { Role } from "../generated/prisma/enums.js";

import {
  getLoanStatusController,
  updateLoanStatusController,
  updateAllOverdueLoansController,
} from "../controllers/loanStatus.controller.js";


const router = Router();


/*
 * ============================================================
 * GET LOAN STATUS
 * ============================================================
 *
 * Customer can see their own loan.
 * Staff can see any loan.
 *
 * GET
 * /api/v1/loan-status/:id
 */

router.get(
  "/:id",
  authenticate,
  getLoanStatusController,
);


/*
 * ============================================================
 * UPDATE SINGLE LOAN STATUS
 * ============================================================
 *
 * Staff only.
 *
 * PATCH
 * /api/v1/loan-status/:id/update
 */

router.patch(
  "/:id/update",
  authenticate,
  authorize(
    Role.FINANCE_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  updateLoanStatusController,
);


/*
 * ============================================================
 * UPDATE ALL OVERDUE LOANS
 * ============================================================
 *
 * Staff only.
 *
 * PATCH
 * /api/v1/loan-status/update-overdue
 *
 * Later this will be called by a background job.
 */

router.patch(
  "/update-overdue",
  authenticate,
  authorize(
    Role.FINANCE_OFFICER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ),
  updateAllOverdueLoansController,
);


export default router;