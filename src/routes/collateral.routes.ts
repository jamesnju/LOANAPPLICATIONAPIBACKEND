import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
  createCollateral,
  deleteCollateral,
  getApplicationCollateral,
  getCollateralById,
  updateCollateral,
  verifyCollateral,
} from "../controllers/collateral.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/application/:applicationId",
  authorize(
    "CUSTOMER",
    "LOAN_OFFICER",
    "ADMIN",
  ),
  createCollateral,
);

router.get(
  "/application/:applicationId",
  authorize(
    "CUSTOMER",
    "LOAN_OFFICER",
    "ADMIN",
    "SUPPORT",
  ),
  getApplicationCollateral,
);

router.get(
  "/:id",
  authorize(
    "CUSTOMER",
    "LOAN_OFFICER",
    "ADMIN",
    "SUPPORT",
  ),
  getCollateralById,
);

router.patch(
  "/:id",
  authorize(
    "CUSTOMER",
    "LOAN_OFFICER",
    "ADMIN",
  ),
  updateCollateral,
);

router.patch(
  "/:id/verify",
  authorize(
    "LOAN_OFFICER",
    "ADMIN",
  ),
  verifyCollateral,
);

router.delete(
  "/:id",
  authorize(
    "CUSTOMER",
    "ADMIN",
  ),
  deleteCollateral,
);

export default router;