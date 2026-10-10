import { Router } from "express";
import { createLoanApplicationController, getCustomerLoanApplicationsController, getCustomerLoanApplicationController, cancelLoanApplicationController, submitLoanApplicationController, getMyDraftApplicationController, deleteDraftApplicationController } from "../controllers/loanApplication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
router.use(authenticate);
router.post("/", createLoanApplicationController);
router.get("/", getCustomerLoanApplicationsController);
router.get("/:id", getCustomerLoanApplicationController);
router.patch("/:id/cancel", cancelLoanApplicationController);
router.patch("/:id/submit", submitLoanApplicationController);
router.get("/me/draft", authenticate, authorize("CUSTOMER"), getMyDraftApplicationController);
router.delete("/:id", authenticate, authorize("CUSTOMER"), deleteDraftApplicationController);
export default router;
//# sourceMappingURL=loanApplication.routes.js.map