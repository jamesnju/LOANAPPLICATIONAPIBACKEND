import { prisma } from "../config/prisma.js";
import {
  AdminKycQueryInput,
  CreateKycDocumentInput,
  CreateKycInput,
  ReviewKycInput,
  UpdateKycInput,
} from "../schemas/kyc.schema.js";
import { logAction } from "./auditLog.service.js";
import { notifyUser } from "./notification.service.js";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 *
 * Splits the flat API payload into:
 *   - userPatch  → goes to prisma.user.update
 *   - kycPatch   → goes to prisma.kyc.create / update
 */

function splitPayload(data: Partial<CreateKycInput>) {
  const userPatch: Record<string, unknown> = {};
  const kycPatch: Record<string, unknown> = {};

  if (data.firstName !== undefined) userPatch.firstName = data.firstName;
  if (data.lastName !== undefined) userPatch.lastName = data.lastName;
  if (data.email !== undefined) userPatch.email = data.email;
  if (data.phoneNumber !== undefined) userPatch.phone = data.phoneNumber;
  if (data.dateOfBirth !== undefined)
    userPatch.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender !== undefined) userPatch.gender = data.gender;
  if (data.employmentStatus !== undefined)
    userPatch.employmentType = data.employmentStatus;
  if (data.employerName !== undefined) userPatch.employerName = data.employerName;
  if (data.monthlyIncome !== undefined) userPatch.monthlyIncome = data.monthlyIncome;

  if (data.nationality !== undefined) kycPatch.nationality = data.nationality;
  if (data.address !== undefined) kycPatch.address = data.address;
  if (data.city !== undefined) kycPatch.city = data.city;
  if (data.county !== undefined) kycPatch.county = data.county;
  if (data.country !== undefined) kycPatch.country = data.country;
  if (data.postalCode !== undefined) kycPatch.postalCode = data.postalCode;
  if (data.identificationType !== undefined)
    kycPatch.identificationType = data.identificationType;
  if (data.identificationNumber !== undefined)
    kycPatch.identificationNumber = data.identificationNumber;
  if (data.identificationCountry !== undefined)
    kycPatch.identificationCountry = data.identificationCountry;
  if (data.incomeSource !== undefined) kycPatch.incomeSource = data.incomeSource;

  return { userPatch, kycPatch };
}

/*
 * ============================================================
 * CUSTOMER KYC
 * ============================================================
 */

export async function createKyc(userId: string, data: CreateKycInput) {
  const existing = await prisma.kyc.findUnique({ where: { userId } });
  if (existing) throw new Error("KYC already exists");

  const { userPatch, kycPatch } = splitPayload(data);

  return prisma.$transaction(async (tx) => {
    // 1. Update personal/employment details on User
    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({ where: { id: userId }, data: userPatch });
    }

    // 2. Create the KYC row with KYC-specific data
    return tx.kyc.create({
      data: {
        userId,
        ...kycPatch,
        status: "PENDING",
        submittedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            employmentType: true,
            employerName: true,
            monthlyIncome: true,
          },
        },
        documents: true,
      },
    });
  });
}

export async function getMyKyc(userId: string) {
  return prisma.kyc.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          employmentType: true,
          employerName: true,
          monthlyIncome: true,
        },
      },
      documents: true,
      reviews: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getKycById(userId: string, id: string) {
  return prisma.kyc.findFirst({
    where: { id, userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          employmentType: true,
        },
      },
      documents: true,
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateKyc(userId: string, data: UpdateKycInput) {
  const kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (!kyc) throw new Error("KYC not found");
  if (kyc.status === "APPROVED")
    throw new Error("Approved KYC cannot be modified");

  const { userPatch, kycPatch } = splitPayload(data);

  return prisma.$transaction(async (tx) => {
    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({ where: { id: userId }, data: userPatch });
    }

    return tx.kyc.update({
      where: { userId },
      data: {
        ...kycPatch,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            employmentType: true,
          },
        },
        documents: true,
      },
    });
  });
}

/*
 * ============================================================
 * DOCUMENTS
 * ============================================================
 */

export async function addKycDocument(
  userId: string,
  data: CreateKycDocumentInput,
) {
  const kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (!kyc)
    throw new Error("Complete your KYC details before uploading documents");
  if (kyc.status === "APPROVED")
    throw new Error("Approved KYC cannot be modified");

  return prisma.kycDocument.create({
    data: {
      kycId: kyc.id,
      type: data.documentType,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      mimeType: data.mimeType,
      documentNumber: data.documentNumber ?? null,
      fileSize: data.fileSize,
    },
  });
}

export async function deleteKycDocument(userId: string, documentId: string) {
  const document = await prisma.kycDocument.findFirst({
    where: { id: documentId, kyc: { userId } },
  });
  if (!document) throw new Error("KYC document not found");

  return prisma.kycDocument.delete({ where: { id: documentId } });
}

/*
 * ============================================================
 * ADMIN / REVIEWER
 * ============================================================
 */

export async function getKycList(query: AdminKycQueryInput) {
  const { page, limit, status, search, sortBy, sortOrder } = query;

  const where: any = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
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
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        documents: true,
      },
    }),
    prisma.kyc.count({ where }),
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

export async function getAdminKycById(id: string) {
  return prisma.kyc.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      documents: true,
      reviews: {
        include: {
          reviewer: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}




export async function reviewKyc(
  kycId: string,
  reviewerId: string,
  data: ReviewKycInput,
) {
  const kyc = await prisma.kyc.findUnique({
    where: { id: kycId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!kyc) throw new Error("KYC not found");

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const statusTimestamps =
      data.status === "APPROVED"
        ? { approvedAt: now, reviewedAt: now }
        : data.status === "REJECTED"
          ? {
              rejectedAt: now,
              reviewedAt: now,
              rejectionReason: data.reviewNotes ?? null,
            }
          : { reviewedAt: now };

    const updatedKyc = await tx.kyc.update({
      where: { id: kycId },
      data: { status: data.status, ...statusTimestamps },
    });

    const review = await tx.kycReview.create({
      data: {
        kycId,
        reviewerId,
        status: data.status,
        reviewNotes: data.reviewNotes ?? null,
      },
    });

    return { kyc: updatedKyc, review };
  });

  /*
   * ----------------------------------------------------------
   * AUDIT LOG
   * ----------------------------------------------------------
   * Written after the transaction commits so the audit record
   * reflects what actually happened. If the audit write fails,
   * the KYC review is still persisted.
   */
  await logAction({
    userId: reviewerId,
    action:
      data.status === "APPROVED"
        ? "APPROVE"
        : data.status === "REJECTED"
          ? "REJECT"
          : "UPDATE",
    entity: "Kyc",
    entityId: kycId,
    description:
      data.status === "APPROVED"
        ? `KYC approved for user ${kyc.user?.email ?? kyc.userId}`
        : data.status === "REJECTED"
          ? `KYC rejected for user ${kyc.user?.email ?? kyc.userId}${
              data.reviewNotes ? `: ${data.reviewNotes}` : ""
            }`
          : `KYC marked under review for user ${kyc.user?.email ?? kyc.userId}`,
    oldValue: { status: kyc.status },
    newValue: { status: data.status },
  });

  /*
   * ----------------------------------------------------------
   * NOTIFICATION
   * ----------------------------------------------------------
   * Fire-and-forget. A failed SMTP send must not roll back the
   * review — it's already committed above.
   */
  await sendKycReviewedNotification(kyc, data).catch((err) => {
    console.error("[KYC] Failed to send review notification:", err);
  });

  return result;
}

/*
 * Map a KYC review action to a user-facing notification.
 * Kept as a separate helper so reviewKyc stays readable.
 */
async function sendKycReviewedNotification(
  kyc: {
    id: string;
    userId: string;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  },
  data: ReviewKycInput,
) {
  const name = kyc.user?.firstName ?? "there";

  switch (data.status) {
    case "APPROVED":
      return notifyUser(
        kyc.userId,
        "APPLICATION_APPROVED",
        "KYC approved",
        `Hi ${name}, your KYC has been approved. You can now apply for a loan.`,
        { kycId: kyc.id, status: "APPROVED" },
      );

    case "REJECTED":
      return notifyUser(
        kyc.userId,
        "APPLICATION_REJECTED",
        "KYC rejected",
        `Hi ${name}, your KYC was rejected${
          data.reviewNotes ? `: ${data.reviewNotes}` : "."
        } Please review the remarks and re-submit.`,
        { kycId: kyc.id, status: "REJECTED" },
      );

    case "UNDER_REVIEW":
    default:
      return notifyUser(
        kyc.userId,
        "GENERAL",
        "KYC under review",
        `Hi ${name}, your KYC is now under review. We'll let you know once it's processed.`,
        { kycId: kyc.id, status: "UNDER_REVIEW" },
      );
  }
}


