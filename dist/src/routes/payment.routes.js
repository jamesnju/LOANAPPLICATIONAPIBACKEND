import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { createPaymentController, getPaymentController, getMyPaymentsController, getLoanPaymentsController, } from "../controllers/payment.controller.js";
const router = Router();
/*
 * ============================================================
 * CUSTOMER PAYMENTS
 * ============================================================
 */
/*
 * Create payment
 *
 * POST
 * /api/v1/payments
 */
router.post("/", authenticate, createPaymentController);
/*
 * Get my payments
 *
 * GET
 * /api/v1/payments/me
 */
router.get("/me", authenticate, getMyPaymentsController);
/*
 * Get payments for a loan
 *
 * GET
 * /api/v1/payments/loan/:loanId
 */
router.get("/loan/:loanId", authenticate, getLoanPaymentsController);
/*
 * Get a specific payment
 *
 * GET
 * /api/v1/payments/:id
 */
router.get("/:id", authenticate, getPaymentController);
export default router;
//# sourceMappingURL=payment.routes.js.map