import { Router } from "express";

import {
  getAdminDashboardController,
} from "../controllers/adminDashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getAdminDashboardController,
);

export default router;