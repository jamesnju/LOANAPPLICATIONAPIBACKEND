import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
} from "../utils/otp.js";

import { VerificationChannel, OtpPurpose } from "../generated/prisma/client.js";

import { sendVerificationEmail } from "./email.service.js";
import { sendVerificationSms } from "./sms.service.js";

export async function createAndSendVerificationOtp(
  userId: string,
  channel: VerificationChannel
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const otp = generateOtp();
  const codeHash = await hashOtp(otp);

  const expiresAt = new Date(
    Date.now() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000
  );

  await prisma.otpCode.updateMany({
    where: {
      userId,
      purpose: OtpPurpose.ACCOUNT_VERIFICATION,
      verifiedAt: null,
    },
    data: {
      verifiedAt: new Date(),
    },
  });

  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      purpose: OtpPurpose.ACCOUNT_VERIFICATION,
      channel,
      expiresAt,
    },
  });

  if (channel === VerificationChannel.EMAIL) {
    await sendVerificationEmail(user.email, otp);
  } else {
    await sendVerificationSms(user.phone, otp);
  }
}

export async function verifyAccountOtp(
  userId: string,
  code: string
): Promise<void> {
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      userId,
      purpose: OtpPurpose.ACCOUNT_VERIFICATION,
      verifiedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    throw new Error("Verification code not found");
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error("Verification code has expired");
  }

  if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new Error("Maximum verification attempts exceeded");
  }

  const valid = await verifyOtp(code, otpRecord.codeHash);

  if (!valid) {
    await prisma.otpCode.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new Error("Invalid verification code");
  }

  await prisma.$transaction([
    prisma.otpCode.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },
      data:
        otpRecord.channel === VerificationChannel.EMAIL
          ? {
              emailVerified: true,
            }
          : {
              phoneVerified: true,
            },
    }),
  ]);
}