import { prisma } from "../config/database.js";

import { env } from "../config/env.js";

import {
  VerificationChannel,
  OtpPurpose,
} from "../generated/prisma/client.js";

import {
  generateOtp,
  hashOtp,
  verifyOtp,
} from "../utils/otp.js";

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email.service.js";

import {
  sendVerificationSms,
} from "./sms.service.js";



const RESET_OTP_TTL_MINUTES = 15;
const RESET_OTP_MAX_ATTEMPTS = 5;
const code = generateOtp();                       
  const codeHash = await bcrypt.hash(code, 10);     
                                                    
  const expiresAt = new Date(Date.now() + RESET_OTP_TTL_MINUTES * 60_000);

import bcrypt from "bcryptjs";

/* ============================================================
 * CREATE + SEND PASSWORD RESET OTP
 * ============================================================ */
export async function createAndSendPasswordResetOtp(
  userId: string,
  email: string,
  firstName: string,
) {
  /* Invalidate any previous un-consumed reset OTPs for this user. */
  await prisma.otpCode.updateMany({
    where: {
      userId,
      purpose: OtpPurpose.PASSWORD_RESET,
      verifiedAt: null,
    },
    data: { verifiedAt: new Date() },
  });

  
  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      purpose: OtpPurpose.PASSWORD_RESET,
      channel: VerificationChannel.EMAIL,
      expiresAt,
    },
  });

  await sendPasswordResetEmail(email, firstName, code, RESET_OTP_TTL_MINUTES);
}

/* ============================================================
 * VERIFY PASSWORD RESET OTP
 * ============================================================ */
export async function verifyPasswordResetOtp(userId: string, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: {
      userId,
      purpose: OtpPurpose.PASSWORD_RESET,
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp)
    throw new Error("No active reset request. Please request a new code.");
  if (otp.expiresAt < new Date()) throw new Error("This code has expired.");
  if (otp.attempts >= RESET_OTP_MAX_ATTEMPTS) {
    throw new Error("Too many attempts. Please request a new code.");
  }

  const ok = await bcrypt.compare(code, otp.codeHash);   // ✅ direct bcrypt
  if (!ok) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid code.");
  }

  return otp;
}


/**
 * CREATE AND SEND VERIFICATION OTP
 */
export async function createAndSendVerificationOtp(
  userId: string,
  channel: VerificationChannel
): Promise<void> {

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
   * Generate OTP
   */
  const otp = generateOtp();


  /*
   * Hash OTP before storing it.
   */
  const codeHash =
    await hashOtp(otp);


  /*
   * Calculate expiry time.
   */
  const expiresAt =
    new Date(
      Date.now() +
        env.OTP_EXPIRES_IN_MINUTES *
          60 *
          1000
    );


  /*
   * Invalidate previous
   * verification OTPs.
   */
  await prisma.otpCode.updateMany({
    where: {
      userId,

      purpose:
        OtpPurpose.ACCOUNT_VERIFICATION,

      verifiedAt: null,
    },

    data: {
      verifiedAt:
        new Date(),
    },
  });


  /*
   * Store new OTP.
   */
  await prisma.otpCode.create({
    data: {
      userId,

      codeHash,

      purpose:
        OtpPurpose.ACCOUNT_VERIFICATION,

      channel,

      expiresAt,
    },
  });


  /*
   * Send OTP.
   */
  if (
    channel ===
    VerificationChannel.EMAIL
  ) {

    await sendVerificationEmail(
      user.email,
      otp
    );

  } else {

    await sendVerificationSms(
      user.phone!,
      otp
    );
  }
}


/**
 * VERIFY ACCOUNT OTP
 */
export async function verifyAccountOtp(
  userId: string,
  code: string
): Promise<void> {

  const otpRecord =
    await prisma.otpCode.findFirst({
      where: {

        userId,

        purpose:
          OtpPurpose.ACCOUNT_VERIFICATION,

        verifiedAt: null,
      },

      orderBy: {
        createdAt: "desc",
      },
    });


  if (!otpRecord) {
    throw new Error(
      "Verification code not found"
    );
  }


  /*
   * Check expiry.
   */
  if (
    otpRecord.expiresAt <
    new Date()
  ) {

    throw new Error(
      "Verification code has expired"
    );
  }


  /*
   * Check maximum attempts.
   */
  if (
    otpRecord.attempts >=
    env.OTP_MAX_ATTEMPTS
  ) {

    throw new Error(
      "Maximum verification attempts exceeded"
    );
  }


  /*
   * Compare OTP with hash.
   */
  const valid =
    await verifyOtp(
      code,
      otpRecord.codeHash
    );


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

    throw new Error(
      "Invalid verification code"
    );
  }


  /*
   * OTP is correct.
   *
   * Mark OTP as verified and
   * update the corresponding
   * verification field.
   */
  await prisma.$transaction([

    prisma.otpCode.update({
      where: {
        id: otpRecord.id,
      },

      data: {
        verifiedAt:
          new Date(),
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },

      data:
        otpRecord.channel ===
        VerificationChannel.EMAIL

          ? {
              emailVerified: true,
            }

          : {
              phoneVerified: true,
            },
    }),
  ]);
}