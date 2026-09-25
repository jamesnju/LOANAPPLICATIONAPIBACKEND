import { Router } from "express";

import {
  register,
  verifyAccount,
  resendOtp,
  login,
  refreshToken,
  logout,
} from "../controllers/auth.controller.js";


const router =
  Router();


/*
 * POST /api/v1/auth/register
 */
router.post(
  "/register",
  register
);


/*
 * POST /api/v1/auth/verify
 */
router.post(
  "/verify",
  verifyAccount
);


/*
 * POST /api/v1/auth/resend-otp
 */
router.post(
  "/resend-otp",
  resendOtp
);


/*
 * POST /api/v1/auth/login
 */
router.post(
  "/login",
  login
);


/*
 * POST /api/v1/auth/refresh
 */
router.post(
  "/refresh",
  refreshToken
);


/*
 * POST /api/v1/auth/logout
 */
router.post(
  "/logout",
  logout
);


export default router;