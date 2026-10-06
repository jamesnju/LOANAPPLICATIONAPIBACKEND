import { prisma } from "../config/prisma.js";
import { uploadImage } from "./cloudinary.service.js";

export async function createGuarantor(
  applicationId: string,
  data: any,
) {
  const application =
    await prisma.loanApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

  if (!application) {
    throw new Error(
      "Loan application not found",
    );
  }

  return prisma.guarantor.create({
    data: {
      applicationId,
      ...data,
    },
  });
}

export async function getApplicationGuarantors(
  applicationId: string,
) {
  return prisma.guarantor.findMany({
    where: {
      applicationId,
    },

    include: {
      documents: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getGuarantorById(
  id: string,
) {
  return prisma.guarantor.findUnique({
    where: {
      id,
    },

    include: {
      application: true,
      documents: true,
    },
  });
}

export async function updateGuarantor(
  id: string,
  data: any,
) {
  return prisma.guarantor.update({
    where: {
      id,
    },

    data,
  });
}

export async function verifyGuarantor(
  id: string,
  isVerified: boolean,
) {
  return prisma.guarantor.update({
    where: {
      id,
    },

    data: {
      isVerified,
    },
  });
}

export async function deleteGuarantor(
  id: string,
) {
  return prisma.guarantor.delete({
    where: {
      id,
    },
  });
}
export async function addGuarantorIdPhoto(
  guarantorId: string,
  side: "FRONT" | "BACK",
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
) {
  const guarantor = await prisma.guarantor.findUnique({
    where: { id: guarantorId },
  });
  if (!guarantor) throw new Error("Guarantor not found");

  // Resolve the CUSTOMER's user id via the parent application.
  // Document.userId is FK -> User.id, so we must use the applicant's id.
  const application = await prisma.loanApplication.findUnique({
    where: { id: guarantor.applicationId },
    select: { userId: true },
  });
  if (!application) throw new Error("Parent application not found");

  const uploaded = await uploadImage(file.buffer, file.originalname);

  // Update the direct field on the guarantor (idFrontUrl / idBackUrl).
  const field = side === "FRONT" ? "idFrontUrl" : "idBackUrl";
  await prisma.guarantor.update({
    where: { id: guarantorId },
    data: { [field]: uploaded.secure_url },
  });

  const docType =
    side === "FRONT" ? "GUARANTOR_ID_FRONT" : "GUARANTOR_ID_BACK";

  return prisma.document.create({
    data: {
      userId: application.userId,   // ✅ the customer's user id
      guarantorId,
      type: docType as any,
      fileName: file.originalname,
      fileUrl: uploaded.secure_url,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: "PENDING",
    },
  });
}
// export async function addGuarantorIdPhoto(
//   guarantorId: string,
//   side: "FRONT" | "BACK",
//   file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
// ) {
//   const guarantor = await prisma.guarantor.findUnique({
//     where: { id: guarantorId },
//   });
//   if (!guarantor) throw new Error("Guarantor not found");

//   const uploaded = await uploadImage(file.buffer, file.originalname);

//   // Update the guarantor's direct field
//   const field = side === "FRONT" ? "idFrontUrl" : "idBackUrl";
//   await prisma.guarantor.update({
//     where: { id: guarantorId },
//     data: { [field]: uploaded.secure_url },
//   });

//   // Also create a Document row so the officer's review page sees it
//   const doc = await prisma.document.create({
//     data: {
//       userId: guarantor.userId ?? guarantor.applicationId, // fall back if guarantor has no user
//       guarantorId,
//       type:
//         side === "FRONT"
//           ? "GUARANTOR_ID_FRONT"
//           : "GUARANTOR_ID_BACK",
//       fileName: file.originalname,
//       fileUrl: uploaded.secure_url,
//       fileSize: file.size,
//       mimeType: file.mimetype,
//       status: "PENDING",
//     },
//   });

//   return doc;
// }