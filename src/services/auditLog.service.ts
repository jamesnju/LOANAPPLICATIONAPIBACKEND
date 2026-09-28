import { prisma } from "../config/prisma.js";

import type {
  AuditAction,
  Role,
} from "../generated/prisma/enums.js";

const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "LOAN_OFFICER",
  "FINANCE_OFFICER",
  "SUPPORT",
];

/*
 * CREATE AUDIT LOG
 */
export async function createAuditLog(data: {
  userId?: string;

  action: AuditAction;

  entity: string;

  entityId?: string;

  oldValue?: any;

  newValue?: any;

  ipAddress?: string;

  userAgent?: string;

  description?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,

      oldValue: data.oldValue,
      newValue: data.newValue,

      ipAddress: data.ipAddress,
      userAgent: data.userAgent,

      description: data.description,
    },
  });
}

/*
 * GET AUDIT LOGS
 */
export async function getAuditLogs(
  requestingUserId: string,
  filters: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: AuditAction;
    page?: number;
    limit?: number;
  },
) {
  const requester =
    await prisma.user.findUnique({
      where: {
        id: requestingUserId,
      },
      select: {
        role: true,
      },
    });

  if (
    !requester ||
    !STAFF_ROLES.includes(requester.role)
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const where = {
    ...(filters.userId && {
      userId: filters.userId,
    }),

    ...(filters.entity && {
      entity: filters.entity,
    }),

    ...(filters.entityId && {
      entityId: filters.entityId,
    }),

    ...(filters.action && {
      action: filters.action,
    }),
  };

  const [logs, total] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.auditLog.count({
        where,
      }),
    ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * GET ONE AUDIT LOG
 */
export async function getAuditLogById(
  id: string,
  requestingUserId: string,
) {
  const requester =
    await prisma.user.findUnique({
      where: {
        id: requestingUserId,
      },
      select: {
        role: true,
      },
    });

  if (
    !requester ||
    !STAFF_ROLES.includes(requester.role)
  ) {
    throw new Error("UNAUTHORIZED");
  }

  return prisma.auditLog.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}