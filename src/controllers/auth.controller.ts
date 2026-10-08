import {
  Request,
  Response,
} from "express";

import {
  registerUser,
  verifyUserAccount,
  loginUser,
  refreshAccessToken,
  logoutUser,
  resendVerificationOtp,
  googleLoginUser,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithOtp,
  logoutAllSessions,
} from "../services/auth.service.js";

import {
  registerSchema,
  verifyAccountSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  resendOtpSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";

export async function googleLogin(req: Request, res: Response) {
  try {
    const input = googleLoginSchema.parse(req.body);
    const result = await googleLoginUser(input);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request",
      });
    }

    /* No account on login page → 404 with a code. */
    if (error?.code === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        message: error.message,
      });
    }

    /* Locked → 423, same semantics as the password flow. */
    if (error?.code === "ACCOUNT_LOCKED") {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: error.message,
      });
    }

    if (error?.code === "ACCOUNT_NOT_ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Google login failed",
    });
  }
}

// export async function googleLogin(req: Request, res: Response) {
//   try {
//     const input = googleLoginSchema.parse(req.body);
//     const result = await googleLoginUser(input);

//     return res.status(200).json({
//       success: true,
//       message: "Login successful.",
//       data: result,
//     });
//   } catch (error) {
//     return res.status(401).json({
//       success: false,
//       message:
//         error instanceof Error ? error.message : "Google login failed",
//     });
//   }
// }
/**
 * REGISTER
 */
export async function register(
  req: Request,
  res: Response
) {

  try {

    const input =
      registerSchema.parse(
        req.body
      );


    const result =
      await registerUser(
        input
      );


    return res
      .status(201)
      .json({

        success: true,

        message:
          "Account created. Verification code sent.",

        data:
          result,
      });

  } catch (error) {

    return res
      .status(400)
      .json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Registration failed",
      });
  }
}


/**
 * VERIFY ACCOUNT
 */
export async function verifyAccount(
  req: Request,
  res: Response
) {

  try {

    const input =
      verifyAccountSchema.parse(
        req.body
      );


    const user =
      await verifyUserAccount(
        input.userId,
        input.code
      );


    return res
      .status(200)
      .json({

        success: true,

        message:
          "Account verified successfully.",

        data:
          user,
      });

  } catch (error) {

    return res
      .status(400)
      .json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Verification failed",
      });
  }
}


/**
 * RESEND OTP
 */
export async function resendOtp(
  req: Request,
  res: Response
) {

  try {

    const input =
      resendOtpSchema.parse(
        req.body
      );


    const result =
      await resendVerificationOtp(
        input.userId,
        input.verificationChannel
      );


    return res
      .status(200)
      .json({

        success: true,

        message:
          result.message,
      });

  } catch (error) {

    return res
      .status(400)
      .json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to resend verification code",
      });
  }
}


/**
 * LOGIN
 */

export async function login(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input.identifier, input.password);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_VERIFIED") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_VERIFIED",
        message: "Please verify your account before logging in.",
      });
    }

    /* ----------------------------------------------------------
     * ACCOUNT LOCKED
     * ----------------------------------------------------------
     * The service throws a message that already includes the
     * remaining minutes, so pass it straight through. We only
     * need to tag it with a code so the client can branch on it.
     */
    if (
      error instanceof Error &&
      error.message.startsWith("Account is locked")
    ) {
      return res.status(423).json({   // 423 Locked — semantically correct
        success: false,
        code: "ACCOUNT_LOCKED",
        message: error.message,
      });
    }

    /* Also surface the "you just got locked" case (4th failure). */
    if (
      error instanceof Error &&
      error.message.startsWith("Too many failed login attempts")
    ) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      code: "INVALID_CREDENTIALS",
      message:
        error instanceof Error ? error.message : "Login failed",
    });
  }
}
// export async function login(
//   req: Request,
//   res: Response
// ) {

//   try {

//     const input =
//       loginSchema.parse(
//         req.body
//       );


//     const result =
//       await loginUser(
//         input.identifier,
//         input.password
//       );


//     return res
//       .status(200)
//       .json({

//         success: true,

//         message:
//           "Login successful.",

//         data:
//           result,
//       });

//   } catch (error) {

//     if (
//       error instanceof Error &&
//       error.message ===
//         "ACCOUNT_NOT_VERIFIED"
//     ) {

//       return res
//         .status(403)
//         .json({

//           success: false,

//           code:
//             "ACCOUNT_NOT_VERIFIED",

//           message:
//             "Please verify your account before logging in.",
//         });
//     }


//     return res
//       .status(401)
//       .json({

//         success: false,

//         message:
//           error instanceof Error
//             ? error.message
//             : "Login failed",
//       });
//   }
// }
export async function refreshController(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "refreshToken required" });
    }

    const result = await refreshAccessToken(refreshToken);
    return res.json({ success: true, data: result });   // { accessToken }
  } catch (err: any) {
    /* Any failure → tell the client the refresh token is dead
     * so it can log out cleanly. */
    return res.status(401).json({
      success: false,
      code: "REFRESH_FAILED",
      message: err instanceof Error ? err.message : "Refresh failed",
    });
  }
}

/**
 * REFRESH TOKEN
 */
export async function refreshToken(
  req: Request,
  res: Response
) {

  try {

    const input =
      refreshTokenSchema.parse(
        req.body
      );


    const result =
      await refreshAccessToken(
        input.refreshToken
      );


    return res
      .status(200)
      .json({

        success: true,

        message:
          "Access token refreshed.",

        data:
          result,
      });

  } catch (error) {

    return res
      .status(401)
      .json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Invalid refresh token",
      });
  }
}


/**
 * LOGOUT
 */
export async function logout(
  req: Request,
  res: Response
) {

  try {

    const input =
      logoutSchema.parse(
        req.body
      );


    await logoutUser(
      input.refreshToken
    );


    return res
      .status(200)
      .json({

        success: true,

        message:
          "Logout successful.",
      });

  } catch (error) {

    return res
      .status(400)
      .json({

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Logout failed",
      });
  }
}

/* ============================================================
 * POST /auth/forgot-password
 * ============================================================ */
export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(identifier);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    /* Zod validation errors → 400 with field message. */
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request",
      });
    }

    /* Account locked → distinct 423 (Locked) with a code the
     * frontend can branch on. */
    if (error?.code === "ACCOUNT_LOCKED") {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: error.message,
      });
    }

    /* Anything else — still don't leak. Return the generic success. */
    console.error("[forgotPasswordController]", error);
    return res.status(200).json({
      success: true,
      message: "If that account exists, a reset code has been sent.",
    });
  }
}


/* ============================================================
 * POST /auth/verify-reset-code
 * ============================================================ */
export async function verifyResetCodeController(req: Request, res: Response) {
  try {
    const { identifier, code } = verifyResetOtpSchema.parse(req.body);
    const result = await verifyResetCode(identifier, code);

    return res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request",
      });
    }
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Invalid or expired code",
    });
  }
}

/* ============================================================
 * POST /auth/reset-password
 * ============================================================ */
export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { identifier, code, newPassword } = resetPasswordSchema.parse(req.body);
    const result = await resetPasswordWithOtp(identifier, code, newPassword);

    return res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request",
      });
    }
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to reset password",
    });
  }
}

export async function logoutAllController(req: Request, res: Response) {
  try {
    /* Requires auth — userId comes from the verified access token. */
    const userId = req.user!.userId;

    const result = await logoutAllSessions(userId);

    return res.json({
      success: true,
      message: "Signed out from all sessions.",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Logout failed",
    });
  }
}