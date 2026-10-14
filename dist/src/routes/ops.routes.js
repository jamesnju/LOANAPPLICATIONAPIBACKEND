import { Router } from "express";
import { getOpsJobHistoryController, listOpsJobsController, runOpsJobController, } from "../controllers/ops.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
router.use(authenticate);
router.use(authorize("SUPER_ADMIN", "ADMIN"));
/* List available jobs */
router.get("/jobs", listOpsJobsController);
/* Run a specific job */
router.post("/jobs/:key/run", runOpsJobController);
/* Recent history */
router.get("/jobs/history", getOpsJobHistoryController);
export default router;
//# sourceMappingURL=ops.routes.js.map