import { Router } from "express";
import { createLoanApplicationController, getCustomerLoanApplicationsController, getCustomerLoanApplicationController, cancelLoanApplicationController, submitLoanApplicationController } from "../controllers/loanApplication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);
router.post("/", createLoanApplicationController);
router.get("/", getCustomerLoanApplicationsController);
router.get("/:id", getCustomerLoanApplicationController);
router.patch("/:id/cancel", cancelLoanApplicationController);
router.patch("/:id/submit", submitLoanApplicationController);
export default router;
//# sourceMappingURL=loanApplication.routes.js.map