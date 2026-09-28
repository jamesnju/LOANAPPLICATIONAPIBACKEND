import { Router } from "express";
import { getLoanPortfolioReportController, getPaymentReportController, getOverdueLoanReportController, getApplicationReportController, } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
/*
 * Loan portfolio
 *
 * GET /api/v1/reports/loans
 */
router.get("/loans", authenticate, authorize("ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER", "LOAN_OFFICER"), getLoanPortfolioReportController);
/*
 * Payment report
 *
 * GET /api/v1/reports/payments
 */
router.get("/payments", authenticate, authorize("ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"), getPaymentReportController);
/*
 * Overdue loans
 *
 * GET /api/v1/reports/overdue
 */
router.get("/overdue", authenticate, authorize("ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER", "LOAN_OFFICER"), getOverdueLoanReportController);
/*
 * Application report
 *
 * GET /api/v1/reports/applications
 */
router.get("/applications", authenticate, authorize("ADMIN", "SUPER_ADMIN", "LOAN_OFFICER"), getApplicationReportController);
export default router;
//# sourceMappingURL=report.routes.js.map