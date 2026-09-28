import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { generateRepaymentScheduleController, getLoanRepaymentSchedulesController, getMyRepaymentSchedulesController, getRepaymentScheduleController, updateOverdueSchedulesController, } from "../controllers/repaymentSchedule.controller.js";
import { Role } from "../generated/prisma/enums.js";
const router = Router();
/*
 * ============================================================
 * CUSTOMER
 * ============================================================
 */
/*
 * Get all repayment schedules belonging
 * to the currently logged-in customer.
 *
 * GET
 * /api/v1/repayment-schedules/me
 */
router.get("/me", authenticate, getMyRepaymentSchedulesController);
/*
 * ============================================================
 * STAFF
 * ============================================================
 */
/*
 * Generate repayment schedule.
 *
 * POST
 * /api/v1/repayment-schedules/loan/:loanId/generate
 *
 * Only finance/admin users can generate schedules.
 */
router.post("/loan/:loanId/generate", authenticate, authorize(Role.FINANCE_OFFICER, Role.ADMIN, Role.SUPER_ADMIN), generateRepaymentScheduleController);
/*
 * ============================================================
 * UPDATE OVERDUE SCHEDULES
 * ============================================================
 *
 * PATCH
 * /api/v1/repayment-schedules/update-overdue
 *
 * Later this will be handled automatically
 * by a background job.
 */
router.patch("/update-overdue", authenticate, authorize(Role.FINANCE_OFFICER, Role.ADMIN, Role.SUPER_ADMIN), updateOverdueSchedulesController);
/*
 * ============================================================
 * LOAN SCHEDULES
 * ============================================================
 */
/*
 * Get all schedules for a particular loan.
 *
 * GET
 * /api/v1/repayment-schedules/loan/:loanId
 *
 * Customer ownership is checked inside
 * the service.
 */
router.get("/loan/:loanId", authenticate, getLoanRepaymentSchedulesController);
/*
 * ============================================================
 * SINGLE REPAYMENT SCHEDULE
 * ============================================================
 */
/*
 * Get one repayment schedule.
 *
 * GET
 * /api/v1/repayment-schedules/:id
 */
router.get("/:id", authenticate, getRepaymentScheduleController);
export default router;
//# sourceMappingURL=repaymentSchedule.routes.js.map