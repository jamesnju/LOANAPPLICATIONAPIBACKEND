
import { Router } from "express";

import {
  createSystemConfig,
  getAllSystemConfigs,
  getOneSystemConfig,
  updateSystemConfig,
  deleteSystemConfig,
} from "../controllers/system-config.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";




const router = Router();


/*
 * GET ALL SYSTEM CONFIGURATIONS
 *
 * GET /api/v1/system-config
 *
 * ADMIN and SUPER_ADMIN only.
 */
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getAllSystemConfigs
);


/*
 * GET ONE SYSTEM CONFIGURATION
 *
 * GET /api/v1/system-config/:id
 *
 * ADMIN and SUPER_ADMIN only.
 */
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  getOneSystemConfig
);


/*
 * CREATE SYSTEM CONFIGURATION
 *
 * POST /api/v1/system-config
 *
 * ADMIN and SUPER_ADMIN only.
 */
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  createSystemConfig
);


/*
 * UPDATE SYSTEM CONFIGURATION
 *
 * PUT /api/v1/system-config/:id
 *
 * ADMIN and SUPER_ADMIN only.
 */
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  updateSystemConfig
);


/*
 * DELETE SYSTEM CONFIGURATION
 *
 * DELETE /api/v1/system-config/:id
 *
 * SUPER_ADMIN only.
 */
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN"),
  deleteSystemConfig
);


export default router;
