import bcrypt from "bcryptjs";

import { prisma } from "../config/prisma.js";
import { logAction } from "./auditLog.service.js";
import { sendAccountUnlockedEmail } from "./email.service.js";

/*
 * Get users with filtering and pagination.
 */
export async function getUsers(params: {
  search?: string;
  role?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const { search, role, status, page, limit } = params;

  const where: any = {};

  if (search) {
    where.OR = [
      {
        firstName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
        },
      },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;

  const [users, total] =
    await Promise.all([
      prisma.user.findMany({
        where,

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: limit,
      }),

      prisma.user.count({
        where,
      }),
    ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * Get one user.
 */
export async function getUserById(
  userId: string,
) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nationalId: true,
      dateOfBirth: true,
      gender: true,
      employmentType: true,
      employerName: true,
      monthlyIncome: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/*
 * Create user.
 */
export async function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
}) {
  const existing =
    await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: data.email,
          },
          {
            phone: data.phone,
          },
        ],
      },
    });

  if (existing) {
    throw new Error(
      "A user with this email or phone already exists",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      data.password,
      12,
    );

  return prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role as any,
      status: data.status as any,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}

/*
 * Update user.
 */
export async function updateUser(
  userId: string,
  data: Record<string, unknown>,
) {
  return prisma.user.update({
    where: {
      id: userId,
    },

    data: data as any,

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nationalId: true,
      employerName: true,
      monthlyIncome: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });
}

/*
 * Update status.
 */
export async function updateUserStatus(
  userId: string,
  status: string,
) {
  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      status: status as any,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });
}

/*
 * Update role.
 */
export async function updateUserRole(
  userId: string,
  role: string,
) {
  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      role: role as any,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });
}

/*
 * Delete user.
 */
export async function deleteUser(
  userId: string,
) {
  return prisma.user.delete({
    where: {
      id: userId,
    },
  });
}

/*
 * Get user's applications.
 */
export async function getUserApplications(
  userId: string,
) {
  return prisma.loanApplication.findMany({
    where: {
      userId,
    },

    include: {
      loanProduct: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Get user's loans.
 */
export async function getUserLoans(
  userId: string,
) {
  return prisma.loan.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}


/*
 * ============================================================
 * GET MY PROFILE
 * ============================================================
 *
 * Returns the full self-view including fields the admin
 * select excludes (e.g. nationalId, address via Kyc).
 */
export async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      nationalId: true,
      dateOfBirth: true,
      gender: true,
      employmentType: true,
      employerName: true,
      monthlyIncome: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      kyc: {
        select: {
          nationality: true,
          address: true,
          city: true,
          county: true,
          country: true,
          postalCode: true,
          status: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");
  return user;
}

/*
 * ============================================================
 * UPDATE MY PROFILE
 * ============================================================
 */
export async function updateMyProfile(
  userId: string,
  data: Record<string, unknown>,
) {
  // `dateOfBirth` arrives already coerced by Zod.
  return prisma.user.update({
    where: { id: userId },
    data: data as any,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      nationalId: true,
      dateOfBirth: true,
      gender: true,
      employmentType: true,
      employerName: true,
      monthlyIncome: true,
      updatedAt: true,
    },
  });
}

/*
 * ============================================================
 * CHANGE PASSWORD (self)
 * ============================================================
 */
export async function changeMyPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) throw new Error("User not found");
  if (!user.passwordHash) {
    throw new Error("This account uses social login and has no password");
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");

  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) throw new Error("New password must differ from the current one");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all refresh tokens — force re-login on other devices.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await logAction({
    userId,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    description: "User changed their password",
  });

  return { success: true };
}

/*
 * ============================================================
 * LOCK / UNLOCK HELPERS
 * ============================================================
 */

const MAX_FAILED_ATTEMPTS = 4;
const LOCK_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Called by the auth service after a *successful* password check.
 * Resets counters and clears any expired lock.
 */
export async function resetLoginAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    },
  });
}

/**
 * Called by the auth service after a *failed* password check.
 * Increments the counter; locks the account when it reaches the threshold.
 *
 * Returns `{ locked: boolean, lockedUntil: Date | null, attemptsLeft: number }`
 */
export async function registerFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  });

  if (!user) throw new Error("User not found");

  const attempts = user.failedLoginAttempts + 1;
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCK_DURATION_MS)
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: attempts,
      lastFailedLoginAt: new Date(),
      ...(shouldLock && {
        status: "LOCKED" as any,
        lockedUntil,
      }),
    },
  });

  return {
    locked: shouldLock,
    lockedUntil,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
  };
}

/**
 * Read-only check used by the login flow *before* verifying the password.
 * Also auto-unlocks if the lock window has elapsed.
 *
 * Returns `{ locked: boolean, lockedUntil: Date | null }`
 */
export async function checkAccountLock(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      lockedUntil: true,
      failedLoginAttempts: true,
    },
  });

  if (!user) throw new Error("User not found");

  const isLocked = user.status === "LOCKED";
  if (!isLocked) {
    return { locked: false, lockedUntil: null };
  }

  // Auto-unlock if the window has passed
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
    return { locked: false, lockedUntil: null };
  }

  return { locked: true, lockedUntil: user.lockedUntil };
}

/**
 * Admin-triggered unlock.
 */


export async function unlockAccount(
  adminUserId: string,
  targetUserId: string,
  reason?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!user) throw new Error("User not found");

  /* ------------------------------------------------------------
   * 1. Flip the account back to ACTIVE and clear lock fields.
   * ------------------------------------------------------------ */
  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status: "ACTIVE",
      lockedUntil: null,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
    },
  });

  /* ------------------------------------------------------------
   * 2. Notify the user by email.
   *
   *    Placed AFTER the DB update, so we only email once the
   *    state change is committed. Wrapped in .catch() so an SMTP
   *    failure can never roll back the unlock or turn a 200 into
   *    a 500 — the account IS unlocked regardless of email.
   * ------------------------------------------------------------ */
  await sendAccountUnlockedEmail(updated.email, updated.firstName).catch((e) =>
    ""
    //console.error("[unlockAccount] email failed:", e),
  );

  /* ------------------------------------------------------------
   * 3. Audit log.
   * ------------------------------------------------------------ */
  await logAction({
    userId: adminUserId,
    action: "UPDATE",
    entity: "User",
    entityId: targetUserId,
    description: `Admin unlocked account${reason ? `: ${reason}` : ""}`,
    oldValue: { status: user.status, lockedUntil: user.lockedUntil },
    newValue: { status: "ACTIVE" },
  });

  return updated;
}