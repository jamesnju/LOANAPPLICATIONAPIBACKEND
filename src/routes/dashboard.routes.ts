// backend/src/routes/dashboard.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
    getAdminDashboardController,
  getCustomerDashboardController,
  
} from "../controllers/dashboard.controller.js";
import { Role } from "../generated/prisma/client.js";

const router = Router();

router.use(authenticate);

/* Customer dashboard — any authenticated CUSTOMER */
router.get(
  "/customer",
  authorize(Role.CUSTOMER),
  getCustomerDashboardController
);

/* Admin dashboard — ADMIN + SUPER_ADMIN (also allow FINANCE_OFFICER to view) */
router.get(
  "/admin",
  authorize(Role.ADMIN, Role.SUPER_ADMIN),
  getAdminDashboardController
);

export default router;