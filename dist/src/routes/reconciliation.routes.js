import { Router } from "express";
import { getReconciliationSummaryController, searchStkRequestsController, getStkRequestDetailController, querySafaricomController, manualResolveController, markFailedController, } from "../controllers/reconciliation.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
router.use(authenticate);
router.use(authorize("SUPER_ADMIN", "ADMIN", "FINANCE_OFFICER"));
router.get("/summary", getReconciliationSummaryController);
router.get("/stk", searchStkRequestsController);
router.get("/stk/:id", getStkRequestDetailController);
router.post("/stk/:id/query-safaricom", querySafaricomController);
router.post("/stk/:id/manual-resolve", manualResolveController);
router.post("/stk/:id/mark-failed", markFailedController);
export default router;
//# sourceMappingURL=reconciliation.routes.js.map