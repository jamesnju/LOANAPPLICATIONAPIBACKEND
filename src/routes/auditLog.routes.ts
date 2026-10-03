import { Router } from "express";



import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/role.middleware.js";
import { getAuditLogsController, getAuditLogController, deleteAuditLogController } from "../controllers/auditLog.controller.js";

const router = Router();

/*
 * Audit logs are restricted to administrators.
 */

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getAuditLogsController,
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getAuditLogController,
);
/*
 * DELETE /api/v1/audit-logs/:id
 *
 * Only SUPER_ADMIN.
 */
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN"),
  deleteAuditLogController,
);
export default router;