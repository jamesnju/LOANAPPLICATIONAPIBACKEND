import { prisma } from "../config/database.js";

import { Role, VerificationChannel } from "../generated/prisma/client.js";

import { hashPassword, comparePassword } from "../utils/password.js";
import { OAuth2Client } from "google-auth-library";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/jwt.js";

import {
  createAndSendPasswordResetOtp,
  createAndSendVerificationOtp,
  verifyAccountOtp,
  verifyPasswordResetOtp,
} from "./otp.service.js";

import { env } from "../config/env.js";
import { logAction } from "./auditLog.service.js";

import {
  checkAccountLock,
  registerFailedLogin,
  resetLoginAttempts,
} from "./user.service.js";

import {
  sendAccountLockedEmail,
} from "./email.service.js";

interface RegisterInput {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  verificationChannel: VerificationChannel;
}

const googleClient = new OAuth2Client(env.GOOGLECLIENTID);

interface GoogleLoginInput {
  idToken: string;
  verificationChannel?: VerificationChannel;
}

/* ============================================================
 * LOGIN / SIGNUP VIA GOOGLE
 * ============================================================ */
export async function googleLoginUser(input: GoogleLoginInput) {
  const ticket = await googleClient.verifyIdToken({
    idToken: input.idToken,
    audience: env.GOOGLECLIENTID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Invalid Google token");
  }

  const {
    email,
    given_name,
    family_name,
    picture,
    sub: googleId,
    email_verified,
  } = payload;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId }, { email }],
    },
    include: { kyc: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firstName: given_name ?? "Customer",
        lastName: family_name ?? "",
        email,
        passwordHash: null,
        googleId,
        avatarUrl: picture ?? null,
        role: Role.CUSTOMER,
        status: "ACTIVE",
        emailVerified: email_verified ?? true,
        phoneVerified: false,
      },
      include: { kyc: true },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, avatarUrl: picture ?? user.avatarUrl },
      include: { kyc: true },
    });
  }

  /* ------------------------------------------------------------
   * LOCKOUT CHECK — even Google login must respect the lock.
   * A user whose password was brute-forced can't bypass the
   * lock by clicking "Sign in with Google" on the same account.
   * ------------------------------------------------------------ */
  const lockState = await checkAccountLock(user.id);
  if (lockState.locked) {
    const mins = lockState.lockedUntil
      ? Math.ceil((lockState.lockedUntil.getTime() - Date.now()) / 60000)
      : 0;

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Blocked Google login (account LOCKED) for ${user.email}`,
      newValue: { success: false, reason: "locked" },
    });

    throw new Error(
      `Account is locked due to too many failed login attempts. ` +
        `Try again in ${mins} minute(s) or contact support.`,
    );
  }

  /* ------------------------------------------------------------
   * Status must be ACTIVE (covers SUSPENDED / BLOCKED / INACTIVE).
   * ------------------------------------------------------------ */
  if (user.status !== "ACTIVE") {
    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Blocked Google login (status=${user.status}) for ${user.email}`,
      newValue: { success: false, reason: "not_active" },
    });

    throw new Error("Account is not active");
  }

  const kycStatus = user.kyc?.status ?? "NOT_STARTED";
  const kycCompleted = kycStatus === "APPROVED";

  /* Successful Google login → clear any stale counters. */
  await resetLoginAttempts(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = calculateExpiration(
    env.REFRESH_TOKEN_EXPIRES_IN,
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  await logAction({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    description: `${user.email} logged in via Google (role: ${user.role})`,
    newValue: { success: true, provider: "google", role: user.role },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
      kycStatus,
      kycCompleted,
    },
  };
}

/* ============================================================
 * REGISTER
 * ============================================================ */
export async function registerUser(input: RegisterInput) {
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingEmail) throw new Error("Email is already registered");

  const existingPhone = await prisma.user.findUnique({
    where: { phone: input.phone },
  });
  if (existingPhone) throw new Error("Phone number is already registered");

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: Role.CUSTOMER,
      status: "ACTIVE",
      emailVerified: false,
      phoneVerified: false,
    },
  });

  await createAndSendVerificationOtp(user.id, input.verificationChannel);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    message:
      "Account created. Please verify your account using the verification code.",
  };
}

/* ============================================================
 * VERIFY ACCOUNT
 * ============================================================ */
export async function verifyUserAccount(userId: string, code: string) {
  await verifyAccountOtp(userId, code);

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) throw new Error("User not found");
  return user;
}

/* ============================================================
 * RESEND VERIFICATION OTP
 * ============================================================ */
export async function resendVerificationOtp(
  userId: string,
  channel: VerificationChannel,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (channel === VerificationChannel.EMAIL && user.emailVerified) {
    throw new Error("Email is already verified");
  }
  if (channel === VerificationChannel.SMS && user.phoneVerified) {
    throw new Error("Phone number is already verified");
  }

  await createAndSendVerificationOtp(userId, channel);
  return { message: "Verification code sent successfully" };
}

/* ============================================================
 * LOGIN
 * ============================================================ */
export async function loginUser(
  identifier: string,
  password: string,
  context?: {
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const attemptStart = Date.now();
  

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
    include: {
      kyc: true,
    },
  });

  /* ------------------------------------------------------------
   * 1. Unknown identifier
   * ------------------------------------------------------------ */
  if (!user) {
   // console.log("[loginUser] ❌ user NOT FOUND for identifier:", identifier);

    await logAction({
      action: "LOGIN",
      entity: "User",
      description: `Failed login attempt for unknown identifier: ${identifier}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: { success: false, reason: "user_not_found" },
    });

    throw new Error("Invalid email/phone or password");
  }

  // console.log("[loginUser] ✓ user found:", {
  //   id: user.id,
  //   email: user.email,
  //   status: user.status,
  //   failedLoginAttempts: user.failedLoginAttempts,
  //   lockedUntil: user.lockedUntil,
  //   lastFailedLoginAt: user.lastFailedLoginAt,
  //   hasPasswordHash: !!user.passwordHash,
  //   emailVerified: user.emailVerified,
  //   phoneVerified: user.phoneVerified,
  // });

  /* ------------------------------------------------------------
   * 2. LOCK CHECK
   * ------------------------------------------------------------ */
  console.log("[loginUser] → checking account lock...");
  const lockState = await checkAccountLock(user.id);
  //console.log("[loginUser] lockState:", lockState);

  if (lockState.locked) {
    const mins = lockState.lockedUntil
      ? Math.ceil((lockState.lockedUntil.getTime() - Date.now()) / 60000)
      : 0;

    //console.log("[loginUser] ❌ account is LOCKED, blocking. mins left:", mins);

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Blocked login (account LOCKED) for ${user.email}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: { success: false, reason: "locked", lockedUntil: lockState.lockedUntil },
    });

    throw new Error(
      `Account is locked due to too many failed login attempts. ` +
        `Try again in ${mins} minute(s) or contact support.`,
    );
  }

  //onsole.log("[loginUser] ✓ account not locked, proceeding");

  /* ------------------------------------------------------------
   * 3. Google-only account
   * ------------------------------------------------------------ */
  if (!user.passwordHash) {
    //console.log("[loginUser] ❌ no password hash (Google-only account)");

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Password login attempted on Google-only account for ${user.email}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: { success: false, reason: "no_password_hash" },
    });

    throw new Error(
      "This account uses Google sign-in. Please use the Google button.",
    );
  }

  /* ------------------------------------------------------------
   * 4. Verify password
   * ------------------------------------------------------------ */
  //console.log("[loginUser] → comparing password...");
  const passwordValid = await comparePassword(password, user.passwordHash);
  //console.log("[loginUser] passwordValid:", passwordValid);

  if (!passwordValid) {
    // console.log("[loginUser] ❌ WRONG PASSWORD — calling registerFailedLogin");
    // console.log("[loginUser]   current state BEFORE increment:", {
    //   failedLoginAttempts: user.failedLoginAttempts,
    //   lockedUntil: user.lockedUntil,
    //   status: user.status,
    // });

    let result;
    try {
      result = await registerFailedLogin(user.id);
    } catch (err) {
      console.error("[loginUser] 🔥 registerFailedLogin THREW:", err);
      throw err;
    }

    //console.log("[loginUser] registerFailedLogin RESULT:", result);

    /* Re-read the user from DB to confirm the write actually landed */
    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        failedLoginAttempts: true,
        lockedUntil: true,
        lastFailedLoginAt: true,
        status: true,
      },
    });
    //console.log("[loginUser] DB state AFTER increment:", after);

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: result.locked
        ? `Account locked after ${result.attemptsLeft === 0 ? "4" : "multiple"} failed attempts for ${user.email}`
        : `Failed login (wrong password) for ${user.email}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: {
        success: false,
        reason: "wrong_password",
        attemptsLeft: result.attemptsLeft,
        locked: result.locked,
      },
    });

    if (result.locked && result.lockedUntil) {
     // console.log("[loginUser] sending lock email to", user.email);
      await sendAccountLockedEmail(
        user.email,
        user.firstName,
        result.lockedUntil,
      ).catch((e) => console.error("[loginUser] lock email failed:", e));
    }

    if (result.locked) {
      //console.log("[loginUser] ❌❌ ACCOUNT NOW LOCKED. Throwing locked error.");
      throw new Error(
        `Too many failed login attempts. Your account has been locked for 4 hours. ` +
          `You will receive an email with the unlock time.`,
      );
    }

   
    throw new Error(
      `Invalid email/phone or password. ${result.attemptsLeft} attempt(s) remaining.`,
    );
  }

  /* ------------------------------------------------------------
   * 5. Password correct — verify/active checks
   * ------------------------------------------------------------ */
  //console.log("[loginUser] ✓ password correct, running post-checks");

  const accountVerified = user.emailVerified || user.phoneVerified;
  //console.log("[loginUser] accountVerified:", accountVerified);

  if (!accountVerified) {
    console.log("[loginUser] ❌ account NOT verified");

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Blocked login (account not verified) for ${user.email}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: { success: false, reason: "not_verified" },
    });

    throw new Error("ACCOUNT_NOT_VERIFIED");
  }

  //console.log("[loginUser] user.status:", user.status);

  if (user.status !== "ACTIVE") {
    console.log("[loginUser] ❌ account NOT active, status:", user.status);

    await logAction({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      description: `Blocked login (status=${user.status}) for ${user.email}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      newValue: { success: false, reason: "not_active" },
    });

    throw new Error("Account is not active");
  }

  /* ------------------------------------------------------------
   * 6. Success
   * ------------------------------------------------------------ */
  console.log("[loginUser] → resetting login attempts");
  await resetLoginAttempts(user.id);

  const kycStatus = user.kyc?.status ?? "NOT_STARTED";
  const kycCompleted = kycStatus === "APPROVED";

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = calculateExpiration(
    env.REFRESH_TOKEN_EXPIRES_IN,
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  await logAction({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    description: `${user.email} logged in (role: ${user.role})`,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    newValue: { success: true, role: user.role },
  });

  console.log(
    "[loginUser] ✅ SUCCESS in",
    Date.now() - attemptStart,
    "ms — user:",
    user.email,
  );
  //console.log("========== [loginUser] ATTEMPT END ==========\n");

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycStatus,
      kycCompleted,
    },
  };
}

/* ============================================================
 * REFRESH ACCESS TOKEN
 * ============================================================ */
export async function refreshAccessToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) throw new Error("Invalid refresh token");
  if (storedToken.revokedAt) throw new Error("Refresh token has been revoked");
  if (storedToken.expiresAt < new Date())
    throw new Error("Refresh token has expired");

  /* ------------------------------------------------------------
   * Re-check lock state on every refresh.
   *
   * Without this, a user who was logged in before the lock could
   * keep refreshing their access token and never actually get
   * locked out. checkAccountLock also auto-unlocks if 4h passed.
   * ------------------------------------------------------------ */
  const lockState = await checkAccountLock(storedToken.user.id);
  if (lockState.locked) {
    throw new Error(
      "Account is locked. Please contact support or wait for auto-unlock.",
    );
  }

  if (storedToken.user.status !== "ACTIVE") {
    throw new Error("Account is not active");
  }

  const accessToken = generateAccessToken({
    userId: storedToken.user.id,
    role: storedToken.user.role,
  });

  return { accessToken };
}

/* ============================================================
 * LOGOUT
 * ============================================================ */
export async function logoutUser(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { message: "Logout successful" };
}

/* ============================================================
 * FORGOT PASSWORD — REQUEST
 * ============================================================
 *
 * Always responds as if the email was sent, to prevent
 * user-enumeration attacks. If the account exists and is not
 * locked, we create and send an OTP.
 */
export async function requestPasswordReset(identifier: string) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
    select: {
      id: true,
      email: true,
      firstName: true,
      status: true,
    },
  });

  /* Unknown account — silent success (no enumeration). */
  if (!user) {
    return { message: "If that account exists, a reset code has been sent." };
  }

  /* Non-active status (SUSPENDED, BLOCKED, INACTIVE) — also silent. */
  if (user.status !== "ACTIVE" && user.status !== "LOCKED") {
    return { message: "If that account exists, a reset code has been sent." };
  }

  /* --- NEW: locked check ---
   * checkAccountLock also auto-unlocks if the 4h window has passed,
   * so a user whose lock just expired gets the normal flow.
   */
  const lock = await checkAccountLock(user.id);
  if (lock.locked) {
    const mins = lock.lockedUntil
      ? Math.ceil((lock.lockedUntil.getTime() - Date.now()) / 60000)
      : 0;

    await logAction({
      userId: user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      description: `Password reset blocked — account is LOCKED`,
      newValue: { step: "otp_blocked_locked", minsRemaining: mins },
    });

    /* Throw a tagged error the controller can recognise. */
    const err: any = new Error(
      `Your account is locked due to too many failed login attempts. ` +
        `Please wait ${mins} minute(s) for it to unlock automatically, ` +
        `or contact support to unlock it now.`,
    );
    err.code = "ACCOUNT_LOCKED";
    err.lockedUntil = lock.lockedUntil;
    throw err;
  }

  await createAndSendPasswordResetOtp(user.id, user.email, user.firstName);

  await logAction({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    description: "Password reset requested",
    newValue: { step: "otp_sent" },
  });

  return { message: "If that account exists, a reset code has been sent." };
}
// export async function requestPasswordReset(identifier: string) {
//   const user = await prisma.user.findFirst({
//     where: {
//       OR: [{ email: identifier }, { phone: identifier }],
//     },
//     select: {
//       id: true,
//       email: true,
//       firstName: true,
//       status: true,
//     },
//   });

//   if (!user) {
//     /* Silent success — do NOT reveal that the account doesn't exist. */
//     return { message: "If that account exists, a reset code has been sent." };
//   }

//   /*
//    * If the account is currently locked, still respond success
//    * (don't reveal lock state either), but don't actually send a
//    * code. The user must wait or contact support.
//    *
//    * If you'd prefer to notify, remove this check — but be aware
//    * it becomes an oracle for "is this account locked".
//    */
//   const lock = await checkAccountLock(user.id);
//   if (lock.locked) {
//     return { message: "If that account exists, a reset code has been sent." };
//   }

//   /* Also skip if the account is not in an active status. */
//   if (user.status !== "ACTIVE") {
//     return { message: "If that account exists, a reset code has been sent." };
//   }

//   await createAndSendPasswordResetOtp(user.id, user.email, user.firstName);

//   await logAction({
//     userId: user.id,
//     action: "UPDATE",
//     entity: "User",
//     entityId: user.id,
//     description: "Password reset requested",
//     newValue: { step: "otp_sent" },
//   });

//   return { message: "If that account exists, a reset code has been sent." };
// }

/* ============================================================
 * FORGOT PASSWORD — VERIFY OTP
 * ============================================================ */
export async function verifyResetCode(
  identifier: string,
  code: string,
) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
    select: { id: true },
  });

  if (!user) throw new Error("Invalid or expired code");

  await verifyPasswordResetOtp(user.id, code);

  return { message: "Code verified" };
}

/* ============================================================
 * FORGOT PASSWORD — RESET
 * ============================================================
 */
export async function resetPasswordWithOtp(
  identifier: string,
  code: string,
  newPassword: string,
) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!user) throw new Error("Invalid or expired code");

  /* Lock check — a locked account can't reset its way out. */
  const lock = await checkAccountLock(user.id);
  if (lock.locked) {
    throw new Error(
      "Account is locked. Please wait for auto-unlock or contact support.",
    );
  }

  /* Verify the OTP *and* mark it consumed in one step. */
  const otp = await verifyPasswordResetOtp(user.id, code);

  /* Refuse to reuse the same password. */
  if (user.passwordHash) {
    const same = await comparePassword(newPassword, user.passwordHash);
    if (same) {
      throw new Error("New password must differ from your current one");
    }
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    /* 1. Update the password. */
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),

    /* 2. Mark the OTP consumed. */
    prisma.otpCode.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    }),

    /* 3. Revoke all refresh tokens — force re-login everywhere. */
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

    /* 4. If the account was somehow locked, clear the lock:
     *    proving control of the reset email is treated as
     *    sufficient identity proof. Remove this block if you'd
     *    rather keep the lock in place. */
    prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
  ]);

  await logAction({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    description: "Password reset completed via OTP",
    newValue: { step: "password_changed" },
  });

  return {
    message: "Password reset successfully. Please log in with your new password.",
  };
}

/* ============================================================
 * HELPERS
 * ============================================================ */
function calculateExpiration(value: string): Date {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiration format: ${value}`);

  const amount = Number(match[1]);
  const unit = match[2];

  let milliseconds = 0;
  switch (unit) {
    case "s":
      milliseconds = amount * 1000;
      break;
    case "m":
      milliseconds = amount * 60 * 1000;
      break;
    case "h":
      milliseconds = amount * 60 * 60 * 1000;
      break;
    case "d":
      milliseconds = amount * 24 * 60 * 60 * 1000;
      break;
  }

  return new Date(Date.now() + milliseconds);
}

// import { prisma } from "../config/database.js";

// import { Role, VerificationChannel } from "../generated/prisma/client.js";

// import { hashPassword, comparePassword } from "../utils/password.js";
// import { OAuth2Client } from "google-auth-library";

// import {
//   generateAccessToken,
//   generateRefreshToken,
//   hashRefreshToken,
// } from "../utils/jwt.js";

// import {
//   createAndSendVerificationOtp,
//   verifyAccountOtp,
// } from "./otp.service.js";

// import { env } from "../config/env.js";
// import { logAction } from "./auditLog.service.js";

// interface RegisterInput {
//   email: string;
//   phone: string;
//   password: string;
//   firstName: string;
//   lastName: string;
//   verificationChannel: VerificationChannel;
// }

// const googleClient = new OAuth2Client(env.GOOGLECLIENTID);

// interface GoogleLoginInput {
//   idToken: string;
//   verificationChannel?: VerificationChannel; // optional; Google = email verified
// }

// /**
//  * LOGIN / SIGNUP VIA GOOGLE
//  *
//  * Frontend sends the Google ID token. We verify it,
//  * then either:
//  *   1. Find the existing user by googleId or email and log them in
//  *   2. Create a new CUSTOMER account (email pre-verified)
//  */
// export async function googleLoginUser(input: GoogleLoginInput) {
//   const ticket = await googleClient.verifyIdToken({
//     idToken: input.idToken,
//     audience: env.GOOGLECLIENTID,
//   });

//   const payload = ticket.getPayload();
//   if (!payload?.email) {
//     throw new Error("Invalid Google token");
//   }

//   const {
//     email,
//     given_name,
//     family_name,
//     picture,
//     sub: googleId,
//     email_verified,
//   } = payload;

//   /*
//    * Find by googleId first, then by email.
//    */
//   let user = await prisma.user.findFirst({
//     where: {
//       OR: [{ googleId }, { email }],
//     },
//     include: { kyc: true },
//   });

//   /*
//    * Create the user if new.
//    */
//   if (!user) {
//     user = await prisma.user.create({
//       data: {
//         firstName: given_name ?? "Customer",
//         lastName: family_name ?? "",
//         email,
//         passwordHash: null,
//         googleId,
//         avatarUrl: picture ?? null,
//         role: Role.CUSTOMER,
//         status: "ACTIVE",
//         emailVerified: email_verified ?? true,
//         phoneVerified: false,
//       },
//       include: { kyc: true },
//     });
//   } else if (!user.googleId) {
//     /*
//      * Existing email/password user signing in with Google for the first time.
//      * Link the google account.
//      */
//     user = await prisma.user.update({
//       where: { id: user.id },
//       data: { googleId, avatarUrl: picture ?? user.avatarUrl },
//       include: { kyc: true },
//     });
//   }

//   /*
//    * Guard: status must be ACTIVE.
//    */
//   if (user.status !== "ACTIVE") {
//     throw new Error("Account is not active");
//   }

//   /*
//    * KYC state.
//    */
//   const kycStatus = user.kyc?.status ?? "NOT_STARTED";
//   const kycCompleted = kycStatus === "APPROVED";

//   /*
//    * Update last login.
//    */
//   await prisma.user.update({
//     where: { id: user.id },
//     data: { lastLoginAt: new Date() },
//   });

//   /*
//    * Issue tokens (same as password login).
//    */
//   const accessToken = generateAccessToken({
//     userId: user.id,
//     role: user.role,
//   });

//   const refreshToken = generateRefreshToken();
//   const tokenHash = hashRefreshToken(refreshToken);
//   const refreshTokenExpiresAt = calculateExpiration(env.REFRESH_TOKEN_EXPIRES_IN);

//   await prisma.refreshToken.create({
//     data: {
//       userId: user.id,
//       tokenHash,
//       expiresAt: refreshTokenExpiresAt,
//     },
//   });
  

//   return {
//     accessToken,
//     refreshToken,
//     user: {
//       id: user.id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       status: user.status,
//       emailVerified: user.emailVerified,
//       phoneVerified: user.phoneVerified,
//       avatarUrl: user.avatarUrl,
//       kycStatus,
//       kycCompleted,
//     },
//   };
// }

// /**
//  * REGISTER
//  */
// export async function registerUser(input: RegisterInput) {
//   /*
//    * Check email.
//    */
//   const existingEmail = await prisma.user.findUnique({
//     where: {
//       email: input.email,
//     },
//   });

//   if (existingEmail) {
//     throw new Error("Email is already registered");
//   }

//   /*
//    * Check phone.
//    */
//   const existingPhone = await prisma.user.findUnique({
//     where: {
//       phone: input.phone,
//     },
//   });

//   if (existingPhone) {
//     throw new Error("Phone number is already registered");
//   }

//   /*
//    * Hash password.
//    */
//   const passwordHash = await hashPassword(input.password);

//   /*
//    * Create customer.
//    */
//   const user = await prisma.user.create({
//     data: {
//       firstName: input.firstName,

//       lastName: input.lastName,

//       email: input.email,

//       phone: input.phone,

//       passwordHash,

//       role: Role.CUSTOMER,

//       status: "ACTIVE",

//       emailVerified: false,

//       phoneVerified: false,
//     },
//   });

//   /*
//    * Send verification OTP.
//    */
//   await createAndSendVerificationOtp(user.id, input.verificationChannel);

//   /*
//    * Return safe information.
//    */
//   return {
//     id: user.id,

//     firstName: user.firstName,

//     lastName: user.lastName,

//     email: user.email,

//     phone: user.phone,

//     emailVerified: user.emailVerified,

//     phoneVerified: user.phoneVerified,

//     message:
//       "Account created. Please verify your account using the verification code.",
//   };
// }

// /**
//  * VERIFY ACCOUNT
//  */
// export async function verifyUserAccount(userId: string, code: string) {
//   await verifyAccountOtp(userId, code);

//   const user = await prisma.user.findUnique({
//     where: {
//       id: userId,
//     },

//     select: {
//       id: true,

//       firstName: true,

//       lastName: true,

//       email: true,

//       phone: true,

//       emailVerified: true,

//       phoneVerified: true,

//       role: true,

//       status: true,
//     },
//   });

//   if (!user) {
//     throw new Error("User not found");
//   }

//   return user;
// }

// /**
//  * RESEND VERIFICATION OTP
//  */
// export async function resendVerificationOtp(
//   userId: string,
//   channel: VerificationChannel,
// ) {
//   const user = await prisma.user.findUnique({
//     where: {
//       id: userId,
//     },
//   });

//   if (!user) {
//     throw new Error("User not found");
//   }

//   /*
//    * Don't resend if already
//    * verified through requested
//    * channel.
//    */
//   if (channel === VerificationChannel.EMAIL && user.emailVerified) {
//     throw new Error("Email is already verified");
//   }

//   if (channel === VerificationChannel.SMS && user.phoneVerified) {
//     throw new Error("Phone number is already verified");
//   }

//   await createAndSendVerificationOtp(userId, channel);

//   return {
//     message: "Verification code sent successfully",
//   };
// }

// /**
//  * LOGIN
//  */

// export async function loginUser(
//   identifier: string,
//   password: string,
//   context?: {
//     ipAddress?: string;
//     userAgent?: string;
//   },
// ) {
//   /*
//    * Find by email OR phone.
//    *
//    * Also load the user's KYC record so the login response can
//    * tell the frontend whether KYC has been completed.
//    */
//   const user = await prisma.user.findFirst({
//     where: {
//       OR: [{ email: identifier }, { phone: identifier }],
//     },
//     include: {
//       kyc: true,
//     },
//   });

//   if (!user) {
//     /*
//      * Log the failed attempt. We don't have a userId, so this
//      * row only carries the identifier (email/phone) in the
//      * description — useful for spotting brute force attempts.
//      */
//     await logAction({
//       action: "LOGIN",
//       entity: "User",
//       description: `Failed login attempt for unknown identifier: ${identifier}`,
//       ipAddress: context?.ipAddress,
//       userAgent: context?.userAgent,
//       newValue: { success: false, reason: "user_not_found" },
//     });

//     throw new Error("Invalid email/phone or password");
//   }

//   /*
//    * Verify password.
//    */
//   const passwordValid = await comparePassword(
//     password,
//     user.passwordHash!,
//   );

//   if (!passwordValid) {
//     await logAction({
//       userId: user.id,
//       action: "LOGIN",
//       entity: "User",
//       entityId: user.id,
//       description: `Failed login (wrong password) for ${user.email}`,
//       ipAddress: context?.ipAddress,
//       userAgent: context?.userAgent,
//       newValue: { success: false, reason: "wrong_password" },
//     });

//     throw new Error("Invalid email/phone or password");
//   }

//   /*
//    * Account must be verified.
//    */
//   const accountVerified = user.emailVerified || user.phoneVerified;

//   if (!accountVerified) {
//     await logAction({
//       userId: user.id,
//       action: "LOGIN",
//       entity: "User",
//       entityId: user.id,
//       description: `Blocked login (account not verified) for ${user.email}`,
//       ipAddress: context?.ipAddress,
//       userAgent: context?.userAgent,
//       newValue: { success: false, reason: "not_verified" },
//     });

//     throw new Error("ACCOUNT_NOT_VERIFIED");
//   }

//   /*
//    * Account must be active.
//    */
//   if (user.status !== "ACTIVE") {
//     await logAction({
//       userId: user.id,
//       action: "LOGIN",
//       entity: "User",
//       entityId: user.id,
//       description: `Blocked login (status=${user.status}) for ${user.email}`,
//       ipAddress: context?.ipAddress,
//       userAgent: context?.userAgent,
//       newValue: { success: false, reason: "not_active" },
//     });

//     throw new Error("Account is not active");
//   }

//   /*
//    * Determine KYC status.
//    */
//   const kycStatus = user.kyc?.status ?? "NOT_STARTED";

//   /*
//    * KYC is considered completed only after approval.
//    */
//   const kycCompleted = kycStatus === "APPROVED";

//   /*
//    * Update last login.
//    */
//   await prisma.user.update({
//     where: { id: user.id },
//     data: { lastLoginAt: new Date() },
//   });

//   /*
//    * Generate access token.
//    */
//   const accessToken = generateAccessToken({
//     userId: user.id,
//     role: user.role,
//   });

//   /*
//    * Generate refresh token + hash it before storing.
//    */
//   const refreshToken = generateRefreshToken();
//   const tokenHash = hashRefreshToken(refreshToken);
//   const refreshTokenExpiresAt = calculateExpiration(
//     env.REFRESH_TOKEN_EXPIRES_IN,
//   );

//   await prisma.refreshToken.create({
//     data: {
//       userId: user.id,
//       tokenHash,
//       expiresAt: refreshTokenExpiresAt,
//     },
//   });

//   /*
//    * ----------------------------------------------------------
//    * AUDIT LOG — successful login
//    * ----------------------------------------------------------
//    * logAction swallows failures, so a broken audit write can
//    * never block a login.
//    */
//   await logAction({
//     userId: user.id,
//     action: "LOGIN",
//     entity: "User",
//     entityId: user.id,
//     description: `${user.email} logged in (role: ${user.role})`,
//     ipAddress: context?.ipAddress,
//     userAgent: context?.userAgent,
//     newValue: { success: true, role: user.role },
//   });

//   /*
//    * Return authentication response.
//    */
//   return {
//     accessToken,
//     refreshToken,
//     user: {
//       id: user.id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       status: user.status,
//       emailVerified: user.emailVerified,
//       phoneVerified: user.phoneVerified,
//       kycStatus,
//       kycCompleted,
//     },
//   };
// }

// /**
//  * REFRESH ACCESS TOKEN
//  */
// export async function refreshAccessToken(refreshToken: string) {
//   /*
//    * Hash supplied token.
//    */
//   const tokenHash = hashRefreshToken(refreshToken);

//   /*
//    * Find token and user.
//    */
//   const storedToken = await prisma.refreshToken.findUnique({
//     where: {
//       tokenHash,
//     },

//     include: {
//       user: true,
//     },
//   });

//   if (!storedToken) {
//     throw new Error("Invalid refresh token");
//   }

//   /*
//    * Check revocation.
//    */
//   if (storedToken.revokedAt) {
//     throw new Error("Refresh token has been revoked");
//   }

//   /*
//    * Check expiration.
//    */
//   if (storedToken.expiresAt < new Date()) {
//     throw new Error("Refresh token has expired");
//   }

//   /*
//    * Check user account.
//    */
//   if (storedToken.user.status !== "ACTIVE") {
//     throw new Error("Account is not active");
//   }

//   /*
//    * Generate new access token.
//    */
//   const accessToken = generateAccessToken({
//     userId: storedToken.user.id,

//     role: storedToken.user.role,
//   });

//   return {
//     accessToken,
//   };
// }

// /**
//  * LOGOUT
//  */
// export async function logoutUser(refreshToken: string) {
//   const tokenHash = hashRefreshToken(refreshToken);

//   await prisma.refreshToken.updateMany({
//     where: {
//       tokenHash,

//       revokedAt: null,
//     },

//     data: {
//       revokedAt: new Date(),
//     },
//   });

//   return {
//     message: "Logout successful",
//   };
// }

// /**
//  * Convert values such as:
//  *
//  * 15m
//  * 7d
//  * 2h
//  *
//  * into a future Date.
//  */
// function calculateExpiration(value: string): Date {
//   const match = value.match(/^(\d+)([smhd])$/);

//   if (!match) {
//     throw new Error(`Invalid expiration format: ${value}`);
//   }

//   const amount = Number(match[1]);

//   const unit = match[2];

//   let milliseconds = 0;

//   switch (unit) {
//     case "s":
//       milliseconds = amount * 1000;
//       break;

//     case "m":
//       milliseconds = amount * 60 * 1000;
//       break;

//     case "h":
//       milliseconds = amount * 60 * 60 * 1000;
//       break;

//     case "d":
//       milliseconds = amount * 24 * 60 * 60 * 1000;
//       break;
//   }

//   return new Date(Date.now() + milliseconds);
// }
