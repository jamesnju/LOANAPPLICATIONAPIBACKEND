import { prisma } from "../config/prisma.js";
export async function logAction(data) {
    try {
        return await createAuditLog(data);
    }
    catch (err) {
        console.error("[AUDIT] Failed to write audit log:", err);
        return null;
    }
}
const STAFF_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "LOAN_OFFICER",
    "FINANCE_OFFICER",
    "SUPPORT",
];
/*
 * CREATE AUDIT LOG
 */
export async function createAuditLog(data) {
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
export async function getAuditLogs(requestingUserId, filters) {
    const requester = await prisma.user.findUnique({
        where: {
            id: requestingUserId,
        },
        select: {
            role: true,
        },
    });
    if (!requester ||
        !STAFF_ROLES.includes(requester.role)) {
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
    const [logs, total] = await Promise.all([
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
export async function getAuditLogById(id, requestingUserId) {
    const requester = await prisma.user.findUnique({
        where: {
            id: requestingUserId,
        },
        select: {
            role: true,
        },
    });
    if (!requester ||
        !STAFF_ROLES.includes(requester.role)) {
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
// append to src/services/auditLog.service.ts
/*
 * DELETE AUDIT LOG
 *
 * Only SUPER_ADMIN should be able to delete audit records.
 */
export async function deleteAuditLog(id, requestingUserId) {
    const requester = await prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { role: true },
    });
    if (!requester || requester.role !== "SUPER_ADMIN") {
        throw new Error("UNAUTHORIZED");
    }
    const existing = await prisma.auditLog.findUnique({
        where: { id },
    });
    if (!existing) {
        throw new Error("NOT_FOUND");
    }
    await prisma.auditLog.delete({ where: { id } });
    return { id };
}
//# sourceMappingURL=auditLog.service.js.map