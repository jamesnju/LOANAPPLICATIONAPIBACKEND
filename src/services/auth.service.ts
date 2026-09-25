import { prisma } from "../config/database.js";

import {
  Role,
  VerificationChannel,
} from "../generated/prisma/client.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/jwt.js";

import {
  createAndSendVerificationOtp,
  verifyAccountOtp,
} from "./otp.service.js";

import { env } from "../config/env.js";


interface RegisterInput {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  verificationChannel:
    VerificationChannel;
}


/**
 * REGISTER
 */
export async function registerUser(
  input: RegisterInput
) {

  /*
   * Check email.
   */
  const existingEmail =
    await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

  if (existingEmail) {
    throw new Error(
      "Email is already registered"
    );
  }


  /*
   * Check phone.
   */
  const existingPhone =
    await prisma.user.findUnique({
      where: {
        phone: input.phone,
      },
    });

  if (existingPhone) {
    throw new Error(
      "Phone number is already registered"
    );
  }


  /*
   * Hash password.
   */
  const passwordHash =
    await hashPassword(
      input.password
    );


  /*
   * Create customer.
   */
  const user =
    await prisma.user.create({

      data: {

        firstName:
          input.firstName,

        lastName:
          input.lastName,

        email:
          input.email,

        phone:
          input.phone,

        passwordHash,

        role:
          Role.CUSTOMER,

        status:
          "ACTIVE",

        emailVerified:
          false,

        phoneVerified:
          false,
      },
    });


  /*
   * Send verification OTP.
   */
  await createAndSendVerificationOtp(
    user.id,
    input.verificationChannel
  );


  /*
   * Return safe information.
   */
  return {

    id:
      user.id,

    firstName:
      user.firstName,

    lastName:
      user.lastName,

    email:
      user.email,

    phone:
      user.phone,

    emailVerified:
      user.emailVerified,

    phoneVerified:
      user.phoneVerified,

    message:
      "Account created. Please verify your account using the verification code.",
  };
}


/**
 * VERIFY ACCOUNT
 */
export async function verifyUserAccount(
  userId: string,
  code: string
) {

  await verifyAccountOtp(
    userId,
    code
  );


  const user =
    await prisma.user.findUnique({

      where: {
        id: userId,
      },

      select: {

        id: true,

        firstName: true,

        lastName: true,

        email: true,

        phone: true,

        emailVerified: true,

        phoneVerified: true,

        role: true,

        status: true,
      },
    });


  if (!user) {
    throw new Error(
      "User not found"
    );
  }


  return user;
}


/**
 * RESEND VERIFICATION OTP
 */
export async function resendVerificationOtp(
  userId: string,
  channel: VerificationChannel
) {

  const user =
    await prisma.user.findUnique({

      where: {
        id: userId,
      },
    });


  if (!user) {
    throw new Error(
      "User not found"
    );
  }


  /*
   * Don't resend if already
   * verified through requested
   * channel.
   */
  if (
    channel ===
      VerificationChannel.EMAIL &&
    user.emailVerified
  ) {

    throw new Error(
      "Email is already verified"
    );
  }


  if (
    channel ===
      VerificationChannel.SMS &&
    user.phoneVerified
  ) {

    throw new Error(
      "Phone number is already verified"
    );
  }


  await createAndSendVerificationOtp(
    userId,
    channel
  );


  return {
    message:
      "Verification code sent successfully",
  };
}


/**
 * LOGIN
 */
export async function loginUser(
  identifier: string,
  password: string
) {

  /*
   * Find by email OR phone.
   */
  const user =
    await prisma.user.findFirst({

      where: {

        OR: [

          {
            email: identifier,
          },

          {
            phone: identifier,
          },
        ],
      },
    });


  if (!user) {

    throw new Error(
      "Invalid email/phone or password"
    );
  }


  /*
   * Verify password.
   */
  const passwordValid =
    await comparePassword(
      password,
      user.passwordHash
    );


  if (!passwordValid) {

    throw new Error(
      "Invalid email/phone or password"
    );
  }


  /*
   * Account must be verified.
   */
  const accountVerified =
    user.emailVerified ||
    user.phoneVerified;


  if (!accountVerified) {

    throw new Error(
      "ACCOUNT_NOT_VERIFIED"
    );
  }


  /*
   * Account must be active.
   */
  if (
    user.status !== "ACTIVE"
  ) {

    throw new Error(
      "Account is not active"
    );
  }


  /*
   * Update last login.
   */
  await prisma.user.update({

    where: {
      id: user.id,
    },

    data: {
      lastLoginAt:
        new Date(),
    },
  });


  /*
   * Access token.
   */
  const accessToken =
    generateAccessToken({

      userId:
        user.id,

      role:
        user.role,
    });


  /*
   * Refresh token.
   */
  const refreshToken =
    generateRefreshToken();


  /*
   * Hash refresh token
   * before storing.
   */
  const tokenHash =
    hashRefreshToken(
      refreshToken
    );


  /*
   * Calculate refresh
   * token expiration.
   *
   * Uses configured
   * REFRESH_TOKEN_EXPIRES_IN.
   */
  const refreshTokenExpiresAt =
    calculateExpiration(
      env.REFRESH_TOKEN_EXPIRES_IN
    );


  /*
   * Store hashed refresh token.
   */
  await prisma.refreshToken.create({

    data: {

      userId:
        user.id,

      tokenHash,

      expiresAt:
        refreshTokenExpiresAt,
    },
  });


  /*
   * Return authentication
   * response.
   */
  return {

    accessToken,

    refreshToken,

    user: {

      id:
        user.id,

      firstName:
        user.firstName,

      lastName:
        user.lastName,

      email:
        user.email,

      phone:
        user.phone,

      role:
        user.role,

      status:
        user.status,

      emailVerified:
        user.emailVerified,

      phoneVerified:
        user.phoneVerified,
    },
  };
}


/**
 * REFRESH ACCESS TOKEN
 */
export async function refreshAccessToken(
  refreshToken: string
) {

  /*
   * Hash supplied token.
   */
  const tokenHash =
    hashRefreshToken(
      refreshToken
    );


  /*
   * Find token and user.
   */
  const storedToken =
    await prisma.refreshToken.findUnique({

      where: {
        tokenHash,
      },

      include: {
        user: true,
      },
    });


  if (!storedToken) {

    throw new Error(
      "Invalid refresh token"
    );
  }


  /*
   * Check revocation.
   */
  if (
    storedToken.revokedAt
  ) {

    throw new Error(
      "Refresh token has been revoked"
    );
  }


  /*
   * Check expiration.
   */
  if (
    storedToken.expiresAt <
    new Date()
  ) {

    throw new Error(
      "Refresh token has expired"
    );
  }


  /*
   * Check user account.
   */
  if (
    storedToken.user.status !==
    "ACTIVE"
  ) {

    throw new Error(
      "Account is not active"
    );
  }


  /*
   * Generate new access token.
   */
  const accessToken =
    generateAccessToken({

      userId:
        storedToken.user.id,

      role:
        storedToken.user.role,
    });


  return {
    accessToken,
  };
}


/**
 * LOGOUT
 */
export async function logoutUser(
  refreshToken: string
) {

  const tokenHash =
    hashRefreshToken(
      refreshToken
    );


  await prisma.refreshToken.updateMany({

    where: {

      tokenHash,

      revokedAt: null,
    },

    data: {

      revokedAt:
        new Date(),
    },
  });


  return {
    message:
      "Logout successful",
  };
}


/**
 * Convert values such as:
 *
 * 15m
 * 7d
 * 2h
 *
 * into a future Date.
 */
function calculateExpiration(
  value: string
): Date {

  const match =
    value.match(
      /^(\d+)([smhd])$/
    );


  if (!match) {

    throw new Error(
      `Invalid expiration format: ${value}`
    );
  }


  const amount =
    Number(match[1]);

  const unit =
    match[2];


  let milliseconds = 0;


  switch (unit) {

    case "s":
      milliseconds =
        amount * 1000;
      break;

    case "m":
      milliseconds =
        amount *
        60 *
        1000;
      break;

    case "h":
      milliseconds =
        amount *
        60 *
        60 *
        1000;
      break;

    case "d":
      milliseconds =
        amount *
        24 *
        60 *
        60 *
        1000;
      break;
  }


  return new Date(
    Date.now() +
      milliseconds
  );
}