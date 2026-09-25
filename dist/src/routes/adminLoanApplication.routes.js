import { Router } from "express";
import { getAdminLoanApplicationsController, getAdminLoanApplicationController, reviewLoanApplicationController } from "../controllers/adminLoanApplication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
router.use(authenticate);
router.use(authorize("SUPER_ADMIN", "ADMIN"));
router.get("/", getAdminLoanApplicationsController);
router.get("/:id", getAdminLoanApplicationController);
router.patch("/:id/review", reviewLoanApplicationController);
export default router;
//# sourceMappingURL=adminLoanApplication.routes.js.map