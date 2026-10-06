import { registerUser, verifyUserAccount, loginUser, refreshAccessToken, logoutUser, resendVerificationOtp, googleLoginUser, } from "../services/auth.service.js";
import { registerSchema, verifyAccountSchema, loginSchema, refreshTokenSchema, logoutSchema, resendOtpSchema, googleLoginSchema, } from "../schemas/auth.schema.js";
export async function googleLogin(req, res) {
    try {
        const input = googleLoginSchema.parse(req.body);
        const result = await googleLoginUser(input);
        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "ACCOUNT_NOT_REGISTERED") {
            return res.status(404).json({
                success: false,
                code: "ACCOUNT_NOT_REGISTERED",
                message: "This Google account is not registered. Please register an account first.",
            });
        }
        if (error instanceof Error &&
            error.message === "Google email is not verified") {
            return res.status(401).json({
                success: false,
                code: "GOOGLE_EMAIL_NOT_VERIFIED",
                message: "Please use a verified Google account.",
            });
        }
        if (error instanceof Error &&
            error.message === "Account is not active") {
            return res.status(403).json({
                success: false,
                code: "ACCOUNT_NOT_ACTIVE",
                message: "Your account is not active.",
            });
        }
        return res.status(401).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Google login failed",
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
export async function register(req, res) {
    try {
        const input = registerSchema.parse(req.body);
        const result = await registerUser(input);
        return res
            .status(201)
            .json({
            success: true,
            message: "Account created. Verification code sent.",
            data: result,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Registration failed",
        });
    }
}
/**
 * VERIFY ACCOUNT
 */
export async function verifyAccount(req, res) {
    try {
        const input = verifyAccountSchema.parse(req.body);
        const user = await verifyUserAccount(input.userId, input.code);
        return res
            .status(200)
            .json({
            success: true,
            message: "Account verified successfully.",
            data: user,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Verification failed",
        });
    }
}
/**
 * RESEND OTP
 */
export async function resendOtp(req, res) {
    try {
        const input = resendOtpSchema.parse(req.body);
        const result = await resendVerificationOtp(input.userId, input.verificationChannel);
        return res
            .status(200)
            .json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to resend verification code",
        });
    }
}
/**
 * LOGIN
 */
export async function login(req, res) {
    try {
        const input = loginSchema.parse(req.body);
        const result = await loginUser(input.identifier, input.password);
        return res
            .status(200)
            .json({
            success: true,
            message: "Login successful.",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message ===
                "ACCOUNT_NOT_VERIFIED") {
            return res
                .status(403)
                .json({
                success: false,
                code: "ACCOUNT_NOT_VERIFIED",
                message: "Please verify your account before logging in.",
            });
        }
        return res
            .status(401)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Login failed",
        });
    }
}
/**
 * REFRESH TOKEN
 */
export async function refreshToken(req, res) {
    try {
        const input = refreshTokenSchema.parse(req.body);
        const result = await refreshAccessToken(input.refreshToken);
        return res
            .status(200)
            .json({
            success: true,
            message: "Access token refreshed.",
            data: result,
        });
    }
    catch (error) {
        return res
            .status(401)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Invalid refresh token",
        });
    }
}
/**
 * LOGOUT
 */
export async function logout(req, res) {
    try {
        const input = logoutSchema.parse(req.body);
        await logoutUser(input.refreshToken);
        return res
            .status(200)
            .json({
            success: true,
            message: "Logout successful.",
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Logout failed",
        });
    }
}
//# sourceMappingURL=auth.controller.js.map