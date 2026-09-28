import bcrypt from "bcryptjs";

import { prisma } from "../config/prisma.js";

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