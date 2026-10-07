import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { changeMyPassword, createUser, deleteUser, getMyProfile, getUserApplications, getUserById, getUserLoans, getUsers, unlockAccount, updateMyProfile, updateUser, updateUserRole, updateUserStatus, } from "../controllers/user.controller.js";
const router = Router();
router.use(authenticate);
/* ============================================================
 * SELF — /users/me  (any authenticated user)
 * MUST come before /:id
 * ============================================================ */
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.post("/me/change-password", changeMyPassword);
/* ============================================================
 * ADMIN — list & create
 * ============================================================ */
router.get("/", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT"), getUsers);
router.post("/", authorize("SUPER_ADMIN", "ADMIN"), createUser);
/* ============================================================
 * ADMIN — per-user operations
 * ============================================================ */
router.get("/:id", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT"), getUserById);
router.patch("/:id", authorize("SUPER_ADMIN", "ADMIN"), updateUser);
router.patch("/:id/status", authorize("SUPER_ADMIN", "ADMIN"), updateUserStatus);
router.patch("/:id/role", authorize("SUPER_ADMIN"), updateUserRole);
/* Unlock a LOCKED account */
router.post("/:id/unlock", authorize("SUPER_ADMIN", "ADMIN"), unlockAccount);
/* Relations */
router.get("/:id/applications", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT", "LOAN_OFFICER"), getUserApplications);
router.get("/:id/loans", authorize("SUPER_ADMIN", "ADMIN", "SUPPORT", "LOAN_OFFICER", "FINANCE_OFFICER"), getUserLoans);
/* Delete */
router.delete("/:id", authorize("SUPER_ADMIN"), deleteUser);
export default router;
// import { Router } from "express";
// import { authenticate } from "../middleware/auth.middleware.js";
// import { authorize } from "../middleware/role.middleware.js";
// import {
//   createUser,
//   deleteUser,
//   getUserApplications,
//   getUserById,
//   getUserLoans,
//   getUsers,
//   updateUser,
//   updateUserRole,
//   updateUserStatus,
// } from "../controllers/user.controller.js";
// const router = Router();
// router.use(authenticate);
// /*
//  * User listing.
//  */
// router.get(
//   "/",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//     "SUPPORT",
//   ),
//   getUsers,
// );
// /*
//  * Create user.
//  */
// router.post(
//   "/",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//   ),
//   createUser,
// );
// /*
//  * User details.
//  */
// router.get(
//   "/:id",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//     "SUPPORT",
//   ),
//   getUserById,
// );
// /*
//  * Update user.
//  */
// router.patch(
//   "/:id",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//   ),
//   updateUser,
// );
// /*
//  * Update status.
//  */
// router.patch(
//   "/:id/status",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//   ),
//   updateUserStatus,
// );
// /*
//  * Change role.
//  */
// router.patch(
//   "/:id/role",
//   authorize(
//     "SUPER_ADMIN",
//   ),
//   updateUserRole,
// );
// /*
//  * User applications.
//  */
// router.get(
//   "/:id/applications",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//     "SUPPORT",
//     "LOAN_OFFICER",
//   ),
//   getUserApplications,
// );
// /*
//  * User loans.
//  */
// router.get(
//   "/:id/loans",
//   authorize(
//     "SUPER_ADMIN",
//     "ADMIN",
//     "SUPPORT",
//     "LOAN_OFFICER",
//     "FINANCE_OFFICER",
//   ),
//   getUserLoans,
// );
// /*
//  * Delete user.
//  */
// router.delete(
//   "/:id",
//   authorize(
//     "SUPER_ADMIN",
//   ),
//   deleteUser,
// );
// export default router;
//# sourceMappingURL=user.routes.js.map