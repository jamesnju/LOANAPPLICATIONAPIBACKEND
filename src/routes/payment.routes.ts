import { Router } from "express";

import {
  getPaymentStatusController,
  initiateStkPushController,
  listMyPaymentsController,
  listPaymentsController,
  manualPaymentController,
  mpesaCallbackController,
} from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

/* ============================================================
 * CALLBACK — public, no auth
 * ============================================================
 * MUST be registered before any `/:id` catch-all, otherwise
 * Express will treat `/mpesa/callback` as matching `/:id` on
 * a narrower path segment.
 * ============================================================ */
router.post("/mpesa/callback", mpesaCallbackController);

/* ============================================================
 * AUTHENTICATED
 * ============================================================ */
router.use(authenticate);

/* Customer initiates STK Push */
router.post("/mpesa/stk-push", initiateStkPushController);

/* Customer polls their own payment status */
router.get("/:id/status", getPaymentStatusController);

/* Customer views their own payments */
router.get("/me", listMyPaymentsController);

/* Admin lists all payments */
router.get(
  "/",
  authorize("SUPER_ADMIN", "ADMIN", "FINANCE_OFFICER"),
  listPaymentsController,
);

/* Admin records a manual payment */
router.post(
  "/manual",
  authorize("SUPER_ADMIN", "ADMIN", "FINANCE_OFFICER"),
  manualPaymentController,
);

export default router;