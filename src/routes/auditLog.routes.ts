import { Router } from "express";



import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/role.middleware.js";
import { getAuditLogsController, getAuditLogController } from "../controllers/auditLog.controller.js";

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

export default router;