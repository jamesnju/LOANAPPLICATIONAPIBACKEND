import { Router } from "express";
import { register, verifyAccount, resendOtp, login, refreshToken, logout, googleLogin, forgotPasswordController, verifyResetCodeController, resetPasswordController, refreshController, logoutAllController, } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.post("/google", googleLogin);
/*
 * POST /api/v1/auth/register
 */
router.post("/register", register);
/*
 * POST /api/v1/auth/verify
 */
router.post("/verify", verifyAccount);
router.post("/refresh", refreshController);
/*
 * POST /api/v1/auth/resend-otp
 */
router.post("/resend-otp", resendOtp);
/*
 * POST /api/v1/auth/login
 */
router.post("/login", login);
/*
 * POST /api/v1/auth/refresh
 */
router.post("/refresh", refreshToken);
/*
 * POST /api/v1/auth/logout
 */
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAllController);
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-reset-code", verifyResetCodeController);
router.post("/reset-password", resetPasswordController);
export default router;
//# sourceMappingURL=auth.routes.js.map