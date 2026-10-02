// src/routes/adminLoanApplication.routes.ts
import { Router } from "express";
import {
  getAdminLoanApplicationsController,
  getAdminLoanApplicationController,
  reviewLoanApplicationController,
} from "../controllers/adminLoanApplication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Every route in this file requires login + one of these roles.
router.use(authenticate);
router.use(
  authorize(
    "SUPER_ADMIN",
    "ADMIN",
    "LOAN_OFFICER",
  ),
);

// GET /api/v1/admin/loan-applications
router.get("/", getAdminLoanApplicationsController);

// GET /api/v1/admin/loan-applications/:id
router.get("/:id", getAdminLoanApplicationController);

// PATCH /api/v1/admin/loan-applications/:id/review
router.patch("/:id/review", reviewLoanApplicationController);

export default router;