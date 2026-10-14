import { Router } from "express";
import { getLoanSummaryController, getPaymentHistoryController, getStatementController, } from "../controllers/customerReport.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
/* Every route is auth-only; scope is enforced by userId in the query. */
router.use(authenticate);
/* GET /api/v1/me/reports/statement?format=json|csv|pdf */
router.get("/statement", getStatementController);
/* GET /api/v1/me/reports/loans?format=json|csv|pdf */
router.get("/loans", getLoanSummaryController);
/* GET /api/v1/me/reports/payments?format=json|csv|pdf */
router.get("/payments", getPaymentHistoryController);
export default router;
//# sourceMappingURL=customerReport.routes.js.map