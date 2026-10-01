import { prisma } from "../config/prisma.js";
import {
  AdminKycQueryInput,
  CreateKycDocumentInput,
  CreateKycInput,
  ReviewKycInput,
  UpdateKycInput,
} from "../schemas/kyc.schema.js";

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
  const kyc = await prisma.kyc.findUnique({ where: { id: kycId } });
  if (!kyc) throw new Error("KYC not found");

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const statusTimestamps =
      data.status === "APPROVED"
        ? { approvedAt: now, reviewedAt: now }
        : data.status === "REJECTED"
          ? { rejectedAt: now, reviewedAt: now, rejectionReason: data.reviewNotes ?? null }
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
}

// import { prisma } from "../config/prisma.js";
// import { AdminKycQueryInput, CreateKycDocumentInput, CreateKycInput, ReviewKycInput, UpdateKycInput } from "../schemas/kyc.schema.js";


// /*
//  * ============================================================
//  * CUSTOMER KYC
//  * ============================================================
//  */

// export async function createKyc(
//   userId: string,
//   data: CreateKycInput,
// ) {
//   const existing = await prisma.kyc.findUnique({
//     where: {
//       userId,
//     },
//   });

//   if (existing) {
//     throw new Error("KYC already exists");
//   }

//   return prisma.kyc.create({
//     data: {
//       userId,
//       ...data,
//       status: "PENDING",
//     },
//     include: {
//       documents: true,
//     },
//   });
// }


// export async function getMyKyc(
//   userId: string,
// ) {
//   return prisma.kyc.findUnique({
//     where: {
//       userId,
//     },
//     include: {
//       documents: true,
//       reviews: {
//         orderBy: {
//           createdAt: "desc",
//         },
//       },
//     },
//   });
// }


// export async function getKycById(
//   userId: string,
//   id: string,
// ) {
//   return prisma.kyc.findFirst({
//     where: {
//       id,
//       userId,
//     },
//     include: {
//       documents: true,
//       reviews: {
//         orderBy: {
//           createdAt: "desc",
//         },
//       },
//     },
//   });
// }


// export async function updateKyc(
//   userId: string,
//   data: UpdateKycInput,
// ) {
//   const kyc = await prisma.kyc.findUnique({
//     where: {
//       userId,
//     },
//   });

//   if (!kyc) {
//     throw new Error("KYC not found");
//   }

//   /*
//    * A customer should not modify approved KYC directly.
//    */
//   if (kyc.status === "APPROVED") {
//     throw new Error(
//       "Approved KYC cannot be modified",
//     );
//   }

//   return prisma.kyc.update({
//     where: {
//       userId,
//     },
//     data: {
//       ...data,
//       status: "PENDING",
//     },
//     include: {
//       documents: true,
//     },
//   });
// }


// /*
//  * ============================================================
//  * DOCUMENTS
//  * ============================================================
//  */

// export async function addKycDocument(
//   userId: string,
//   data: CreateKycDocumentInput,
// ) {
//   /*
//    * ============================================================
//    * FIND CUSTOMER KYC
//    * ============================================================
//    */
//   const kyc = await prisma.kyc.findUnique({
//     where: {
//       userId,
//     },
//   });

//   /*
//    * Customer must create their KYC details before
//    * uploading supporting documents.
//    */
//   if (!kyc) {
//     throw new Error(
//       "Complete your KYC details before uploading documents",
//     );
//   }

//   /*
//    * Approved KYC should not be modified directly.
//    */
//   if (kyc.status === "APPROVED") {
//     throw new Error(
//       "Approved KYC cannot be modified",
//     );
//   }

//   /*
//    * ============================================================
//    * CREATE KYC DOCUMENT
//    * ============================================================
//    *
//    * Our API/schema calls this field:
//    *
//    * documentType
//    *
//    * But the Prisma KycDocument model calls it:
//    *
//    * type
//    *
//    * Therefore we explicitly map:
//    *
//    * documentType -> type
//    */
//   return prisma.kycDocument.create({
//     data: {
//       kycId: kyc.id,

//       type: data.documentType,

//       fileUrl: data.fileUrl,

//       fileName: data.fileName,

//       mimeType: data.mimeType,
//       documentNumber: data.documentNumber ?? null,

//       fileSize: data.fileSize,
//     },
//   });
// }




// export async function deleteKycDocument(
//   userId: string,
//   documentId: string,
// ) {
//   const document =
//     await prisma.kycDocument.findFirst({
//       where: {
//         id: documentId,
//         kyc: {
//           userId,
//         },
//       },
//     });

//   if (!document) {
//     throw new Error(
//       "KYC document not found",
//     );
//   }

//   return prisma.kycDocument.delete({
//     where: {
//       id: documentId,
//     },
//   });
// }


// /*
//  * ============================================================
//  * ADMIN / REVIEWER
//  * ============================================================
//  */

// export async function getKycList(
//   query: AdminKycQueryInput,
// ) {
//   const {
//     page,
//     limit,
//     status,
//     search,
//     sortBy,
//     sortOrder,
//   } = query;

//   const where: any = {
//     ...(status && { status }),

//     ...(search && {
//       OR: [
//         {
//           firstName: {
//             contains: search,
//             mode: "insensitive",
//           },
//         },
//         {
//           lastName: {
//             contains: search,
//             mode: "insensitive",
//           },
//         },
//         {
//           identificationNumber: {
//             contains: search,
//             mode: "insensitive",
//           },
//         },
//       ],
//     }),
//   };

//   const [items, total] =
//     await prisma.$transaction([
//       prisma.kyc.findMany({
//         where,
//         skip: (page - 1) * limit,
//         take: limit,
//         orderBy: {
//           [sortBy]: sortOrder,
//         },
//         include: {
//           user: {
//             select: {
//               id: true,
//               email: true,
//               phoneNumber: true,
//             },
//           },
//           documents: true,
//         },
//       }),

//       prisma.kyc.count({
//         where,
//       }),
//     ]);

//   return {
//     items,
//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// }


// export async function getAdminKycById(
//   id: string,
// ) {
//   return prisma.kyc.findUnique({
//     where: {
//       id,
//     },
//     include: {
//       user: {
//         select: {
//           id: true,
//           email: true,
//           phoneNumber: true,
//           createdAt: true,
//         },
//       },
//       documents: true,
//       reviews: {
//         include: {
//           reviewer: {
//             select: {
//               id: true,
//               email: true,
//             },
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//       },
//     },
//   });
// }


// export async function reviewKyc(
//   kycId: string,
//   reviewerId: string,
//   data: ReviewKycInput,
// ) {
//   const kyc = await prisma.kyc.findUnique({
//     where: {
//       id: kycId,
//     },
//   });

//   if (!kyc) {
//     throw new Error("KYC not found");
//   }

//   return prisma.$transaction(
//     async (tx) => {
//       const updatedKyc =
//         await tx.kyc.update({
//           where: {
//             id: kycId,
//           },
//           data: {
//             status: data.status,
//           },
//         });

//       const review =
//         await tx.kycReview.create({
//           data: {
//             kycId,
//             reviewerId,
//             status: data.status,
//             reviewNotes:
//               data.reviewNotes ?? null,
//           },
//         });

//       return {
//         kyc: updatedKyc,
//         review,
//       };
//     },
//   );
// }

