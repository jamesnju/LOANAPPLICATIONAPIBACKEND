import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getLoanTransactionController, getLoanTransactionsController, getMyLoanTransactionsController, } from "../controllers/loanTransaction.controller.js";
const router = Router();
/*
 * ============================================================
 * MY TRANSACTIONS
 * ============================================================
 */
router.get("/me", authenticate, getMyLoanTransactionsController);
/*
 * ============================================================
 * LOAN TRANSACTIONS
 * ============================================================
 */
router.get("/loan/:loanId", authenticate, getLoanTransactionsController);
/*
 * ============================================================
 * SINGLE TRANSACTION
 * ============================================================
 */
router.get("/:id", authenticate, getLoanTransactionController);
export default router;
//# sourceMappingURL=loanTransaction.routes.js.map