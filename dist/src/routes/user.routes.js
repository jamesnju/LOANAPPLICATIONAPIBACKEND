import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { createUser, deleteUser, getUserApplications, getUserById, getUserLoans, getUsers, updateUser, updateUserRole, updateUserStatus, } from "../controllers/user.controller.js";
const router = Router();
router.use(authenticate);
/*
 * User listing.
 */
router.get("/", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT"), getUsers);
/*
 * Create user.
 */
router.post("/", authorize("SUPER_ADMIN", "ADMIN"), createUser);
/*
 * User details.
 */
router.get("/:id", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT"), getUserById);
/*
 * Update user.
 */
router.patch("/:id", authorize("SUPER_ADMIN", "ADMIN"), updateUser);
/*
 * Update status.
 */
router.patch("/:id/status", authorize("SUPER_ADMIN", "ADMIN"), updateUserStatus);
/*
 * Change role.
 */
router.patch("/:id/role", authorize("SUPER_ADMIN"), updateUserRole);
/*
 * User applications.
 */
router.get("/:id/applications", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT", "LOAN_OFFICER"), getUserApplications);
/*
 * User loans.
 */
router.get("/:id/loans", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT", "LOAN_OFFICER", "FINANCE_OFFICER"), getUserLoans);
/*
 * Delete user.
 */
router.delete("/:id", authorize("SUPER_ADMIN"), deleteUser);
export default router;
//# sourceMappingURL=user.routes.js.map