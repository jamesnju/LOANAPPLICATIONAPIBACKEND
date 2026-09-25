import { prisma } from "../config/prisma.js";
/*
 * ============================================================
 * CUSTOMER KYC
 * ============================================================
 */
export async function createKyc(userId, data) {
    const existing = await prisma.kyc.findUnique({
        where: {
            userId,
        },
    });
    if (existing) {
        throw new Error("KYC already exists");
    }
    return prisma.kyc.create({
        data: {
            userId,
            ...data,
            status: "PENDING",
        },
        include: {
            documents: true,
        },
    });
}
export async function getMyKyc(userId) {
    return prisma.kyc.findUnique({
        where: {
            userId,
        },
        include: {
            documents: true,
            reviews: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
}
export async function getKycById(userId, id) {
    return prisma.kyc.findFirst({
        where: {
            id,
            userId,
        },
        include: {
            documents: true,
            reviews: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
}
export async function updateKyc(userId, data) {
    const kyc = await prisma.kyc.findUnique({
        where: {
            userId,
        },
    });
    if (!kyc) {
        throw new Error("KYC not found");
    }
    /*
     * A customer should not modify approved KYC directly.
     */
    if (kyc.status === "APPROVED") {
        throw new Error("Approved KYC cannot be modified");
    }
    return prisma.kyc.update({
        where: {
            userId,
        },
        data: {
            ...data,
            status: "PENDING",
        },
        include: {
            documents: true,
        },
    });
}
/*
 * ============================================================
 * DOCUMENTS
 * ============================================================
 */
export async function addKycDocument(userId, data) {
    /*
     * ============================================================
     * FIND CUSTOMER KYC
     * ============================================================
     */
    const kyc = await prisma.kyc.findUnique({
        where: {
            userId,
        },
    });
    /*
     * Customer must create their KYC details before
     * uploading supporting documents.
     */
    if (!kyc) {
        throw new Error("Complete your KYC details before uploading documents");
    }
    /*
     * Approved KYC should not be modified directly.
     */
    if (kyc.status === "APPROVED") {
        throw new Error("Approved KYC cannot be modified");
    }
    /*
     * ============================================================
     * CREATE KYC DOCUMENT
     * ============================================================
     *
     * Our API/schema calls this field:
     *
     * documentType
     *
     * But the Prisma KycDocument model calls it:
     *
     * type
     *
     * Therefore we explicitly map:
     *
     * documentType -> type
     */
    return prisma.kycDocument.create({
        data: {
            kycId: kyc.id,
            type: data.documentType,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
        },
    });
}
export async function deleteKycDocument(userId, documentId) {
    const document = await prisma.kycDocument.findFirst({
        where: {
            id: documentId,
            kyc: {
                userId,
            },
        },
    });
    if (!document) {
        throw new Error("KYC document not found");
    }
    return prisma.kycDocument.delete({
        where: {
            id: documentId,
        },
    });
}
/*
 * ============================================================
 * ADMIN / REVIEWER
 * ============================================================
 */
export async function getKycList(query) {
    const { page, limit, status, search, sortBy, sortOrder, } = query;
    const where = {
        ...(status && { status }),
        ...(search && {
            OR: [
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
                    identificationNumber: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ],
        }),
    };
    const [items, total] = await prisma.$transaction([
        prisma.kyc.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                documents: true,
            },
        }),
        prisma.kyc.count({
            where,
        }),
    ]);
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
export async function getAdminKycById(id) {
    return prisma.kyc.findUnique({
        where: {
            id,
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    createdAt: true,
                },
            },
            documents: true,
            reviews: {
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
}
export async function reviewKyc(kycId, reviewerId, data) {
    const kyc = await prisma.kyc.findUnique({
        where: {
            id: kycId,
        },
    });
    if (!kyc) {
        throw new Error("KYC not found");
    }
    return prisma.$transaction(async (tx) => {
        const updatedKyc = await tx.kyc.update({
            where: {
                id: kycId,
            },
            data: {
                status: data.status,
            },
        });
        const review = await tx.kycReview.create({
            data: {
                kycId,
                reviewerId,
                status: data.status,
                reviewNotes: data.reviewNotes ?? null,
            },
        });
        return {
            kyc: updatedKyc,
            review,
        };
    });
}
//# sourceMappingURL=kyc.service.js.map