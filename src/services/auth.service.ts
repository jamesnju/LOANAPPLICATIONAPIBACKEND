import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

import {
  UserRole,
  VerificationChannel,
} from "../generated/prisma/client.js";

import { hashPassword, comparePassword } from "../utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/jwt.js";

import {
  createAndSendVerificationOtp,
  verifyAccountOtp,
} from "./otp.service.js";

interface RegisterInput {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  verificationChannel: VerificationChannel;
}

export async function registerUser(input: RegisterInput) {
  const existingEmail = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingEmail) {
    throw new Error("Email is already registered");
  }

  const existingPhone = await prisma.user.findUnique({
    where: {
      phone: input.phone,
    },
  });

  if (existingPhone) {
    throw new Error("Phone number is already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: UserRole.CUSTOMER,

      profile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
        },
      },
    },

    include: {
      profile: true,
    },
  });

  await createAndSendVerificationOtp(
    user.id,
    input.verificationChannel
  );

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    verified: false,
    message:
      "Account created. Please verify your account using the verification code.",
  };
}

export async function verifyUserAccount(
  userId: string,
  code: string
) {
  await verifyAccountOtp(userId, code);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  return user;
}

export async function loginUser(
  identifier: string,
  password: string
) {
  const user = await prisma.user.findFirst({
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
    throw new Error("Invalid email/phone or password");
  }

  const passwordValid = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new Error("Invalid email/phone or password");
  }

  const accountVerified =
    user.emailVerified || user.phoneVerified;

  if (!accountVerified) {
    throw new Error(
      "ACCOUNT_NOT_VERIFIED"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is not active");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const refreshTokenExpiresAt = new Date();

  refreshTokenExpiresAt.setDate(
    refreshTokenExpiresAt.getDate() + 7
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,

    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    },
  };
}

export async function refreshAccessToken(
  refreshToken: string
) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },

    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new Error("Invalid refresh token");
  }

  if (storedToken.revokedAt) {
    throw new Error("Refresh token has been revoked");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token has expired");
  }

  const accessToken = generateAccessToken({
    userId: storedToken.user.id,
    role: storedToken.user.role,
  });

  return {
    accessToken,
  };
}

export async function logoutUser(
  refreshToken: string
) {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}