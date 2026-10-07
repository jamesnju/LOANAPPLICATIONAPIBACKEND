import fs from "node:fs";
import path from "node:path";
import type { DocumentType } from "../generated/prisma/enums.js";

import { prisma } from "../config/prisma.js";

/*
 * Location of the official loan application template.
 *
 * Current file:
 *
 * backend/src/documents/
 * PesaMaishaCapital_TemplateForm.docx
 */
const applicationTemplatePath = path.resolve(
  process.cwd(),
  "src",
  "documents",
  "PesaMaishaCapital_TemplateForm.docx",
);

/*
 * Get the official application template.
 */
export function getApplicationTemplate() {
  if (
    !fs.existsSync(
      applicationTemplatePath,
    )
  ) {
    throw new Error(
      "Loan application template was not found.",
    );
  }

  return applicationTemplatePath;
}

/*
 * Verify that the loan application exists
 * and belongs to the currently logged-in user.
 */
// src/services/document.service.ts


/*
 * ============================================================
 * OWNERSHIP CHECKS
 * ============================================================
 */

export async function verifyApplicationOwnership(
  applicationId: string,
  userId: string,
) {
  const app = await prisma.loanApplication.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });

  if (!app) {
    throw new Error("You do not have access to this application");
  }
}

export async function verifyGuarantorOwnership(
  guarantorId: string,
  userId: string,
) {
  const g = await prisma.guarantor.findFirst({
    where: {
      id: guarantorId,
      // Guarantor -> LoanApplication -> userId
      application: { userId },
    },
    select: { id: true },
  });

  if (!g) {
    throw new Error("You do not have access to this guarantor");
  }
}

export async function verifyCollateralOwnership(
  collateralId: string,
  userId: string,
) {
  const c = await prisma.collateral.findFirst({
    where: {
      id: collateralId,
      application: { userId },
    },
    select: { id: true },
  });

  if (!c) {
    throw new Error("You do not have access to this collateral");
  }
}

/*
 * ============================================================
 * CREATE HELPERS
 * ============================================================
 */

/**
 * Application-form specific (used by uploadApplicationDocument).
 * Type is forced to APPLICATION_FORM.
 */
export async function createApplicationDocument(
  userId: string,
  applicationId: string,
  data: {
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    mimeType?: string | null;
  },
) {
  return prisma.document.create({
    data: {
      userId,
      applicationId,
      type: "APPLICATION_FORM" as DocumentType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      status: "PENDING",
    },
  });
}

/**
 * Generic scoped upload (guarantor / collateral / extra application docs).
 * Exactly one (or more) of applicationId / guarantorId / collateralId
 * should be provided — the controller enforces this.
 */
export async function createScopedDocument(
  userId: string,
  data: {
    type: DocumentType;
    applicationId?: string | null;
    guarantorId?: string | null;
    collateralId?: string | null;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    mimeType?: string | null;
  },
)
 {
  return prisma.document.create({
    data: {
      userId,
      applicationId: data.applicationId ?? null,
      guarantorId: data.guarantorId ?? null,
      collateralId: data.collateralId ?? null,
      type: data.type,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      status: "PENDING",
    },
  });
}

/*
 * Save the completed application document.
 *
 * IMPORTANT:
 *
 * This function currently expects a file URL.
 *
 * Your upload layer can upload the DOCX to
 * Cloudinary/object storage and pass the resulting
 * URL here.
 */


/*
 * Get application documents.
 */
export async function getApplicationDocuments(
  applicationId: string,
  userId: string,
  isStaff = false,
) {
  /*
   * Customers can only access their own
   * application.
   */
  if (!isStaff) {
    await verifyApplicationOwnership(
      applicationId,
      userId,
    );
  }

  return prisma.document.findMany({
    where: {
      applicationId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Get one document.
 */
export async function getDocumentById(
  documentId: string,
  userId: string,
  isStaff = false,
) {
  const document =
    await prisma.document.findUnique({
      where: {
        id: documentId,
      },

      include: {
        application: true,
      },
    });

  if (!document) {
    throw new Error(
      "Document not found.",
    );
  }

  /*
   * Staff can access documents they are
   * authorized to review.
   */
  if (isStaff) {
    return document;
  }

  /*
   * Customers can only access their own
   * documents.
   */
  if (document.userId !== userId) {
    throw new Error(
      "You do not have permission to access this document.",
    );
  }

  return document;
}

/*
 * Verify a document.
 */
export async function verifyDocument(
  documentId: string,
  verifiedBy: string,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },

    data: {
      status: "VERIFIED" as any,
      verifiedAt: new Date(),
      verifiedBy,
      rejectionReason: null,
    },
  });
}

/*
 * Reject a document.
 */
export async function rejectDocument(
  documentId: string,
  verifiedBy: string,
  rejectionReason: string,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },

    data: {
      status: "REJECTED" as any,
      verifiedAt: null,
      verifiedBy,
      rejectionReason,
    },
  });
}

/*
 * Delete a document.
 */
export async function deleteDocument(
  documentId: string,
  userId: string,
) {
  const document =
    await prisma.document.findUnique({
      where: {
        id: documentId,
      },
    });

  if (!document) {
    throw new Error(
      "Document not found.",
    );
  }

  // if (document.userId !== userId) {
  //   throw new Error(
  //     "You do not have permission to delete this document.",
  //   );
  // }

  return prisma.document.delete({
    where: {
      id: documentId,
    },
  });
}
/*
 * Confirm the collateral belongs to the user (via its application).
 */

