import { Router } from "express";

import {
  getAdminKycController,
  getAdminKycByIdController,
  reviewKycController,
} from "../controllers/adminKyc.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 *
 * Every route in this router requires a valid JWT access token.
 */
router.use(authenticate);

/*
 * ============================================================
 * AUTHORIZATION
 * ============================================================
 *
 * Only the following roles can access admin KYC endpoints:
 *
 * SUPER_ADMIN
 * ADMIN
 * REVIEWER
 */
router.use(
  authorize(
    "SUPER_ADMIN",
    "ADMIN",
    //"REVIEWER",
  ),
);

/*
 * ============================================================
 * GET ALL KYC RECORDS
 * ============================================================
 *
 * GET /api/v1/admin/kyc
 */
router.get(
  "/",
  getAdminKycController,
);

/*
 * ============================================================
 * GET KYC BY ID
 * ============================================================
 *
 * GET /api/v1/admin/kyc/:id
 */
router.get(
  "/:id",
  getAdminKycByIdController,
);

/*
 * ============================================================
 * REVIEW KYC
 * ============================================================
 *
 * PATCH /api/v1/admin/kyc/:id/review
 */
router.patch(
  "/:id/review",
  reviewKycController,
);

export default router;

