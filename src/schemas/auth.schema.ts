import { z } from "zod";


/**
 * REGISTER
 */
export const registerSchema =
  z.object({

    firstName:
      z.string()
        .trim()
        .min(
          2,
          "First name is required"
        ),

    lastName:
      z.string()
        .trim()
        .min(
          2,
          "Last name is required"
        ),

    email:
      z.string()
        .trim()
        .email(
          "Invalid email address"
        ),

    phone:
      z.string()
        .trim()
        .min(
          10,
          "Invalid phone number"
        ),

    password:
      z.string()
        .min(
          8,
          "Password must be at least 8 characters"
        ),

    verificationChannel:
      z.enum([
        "EMAIL",
        "SMS",
      ]),
  });


/**
 * VERIFY ACCOUNT
 */
export const verifyAccountSchema =
  z.object({

    userId:
      z.string()
        .uuid(
          "Invalid user ID"
        ),

    code:
      z.string()
        .regex(
          /^\d{6}$/,
          "Verification code must be 6 digits"
        ),
  });


/**
 * LOGIN
 */
export const loginSchema =
  z.object({

    identifier:
      z.string()
        .trim()
        .min(
          1,
          "Email or phone is required"
        ),

    password:
      z.string()
        .min(
          1,
          "Password is required"
        ),
  });


/**
 * REFRESH TOKEN
 */
export const refreshTokenSchema =
  z.object({

    refreshToken:
      z.string()
        .min(
          1,
          "Refresh token is required"
        ),
  });


/**
 * LOGOUT
 */
export const logoutSchema =
  z.object({

    refreshToken:
      z.string()
        .min(
          1,
          "Refresh token is required"
        ),
  });


/**
 * RESEND OTP
 */
export const resendOtpSchema =
  z.object({

    userId:
      z.string()
        .uuid(
          "Invalid user ID"
        ),

    verificationChannel:
      z.enum([
        "EMAIL",
        "SMS",
      ]),
  });