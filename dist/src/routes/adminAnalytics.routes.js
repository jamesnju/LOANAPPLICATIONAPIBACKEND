import { Router } from "express";
import { getAnalyticsOverviewController, getAnalyticsTimeSeriesController, getProductPerformanceController, getCohortAnalysisController, getActivityFeedController, } from "../controllers/adminAnalytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
router.use(authenticate);
router.use(authorize("ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"));
router.get("/overview", getAnalyticsOverviewController);
router.get("/timeseries", getAnalyticsTimeSeriesController);
router.get("/products", getProductPerformanceController);
router.get("/cohorts", getCohortAnalysisController);
router.get("/activity", getActivityFeedController);
export default router;
//# sourceMappingURL=adminAnalytics.routes.js.map