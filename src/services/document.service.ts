import fs from "node:fs";
import path from "node:path";

import { prisma } from "../config/prisma.js";

/*
 * Location of the official loan application template.
 *
 * Current file:
 *
 * backend/src/documents/
 * KOPAFLEX APPLICATION FORM.docx
 */
const applicationTemplatePath = path.resolve(
  process.cwd(),
  "src",
  "documents",
  "KOPAFLEX APPLICATION FORM.docx",
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
export async function verifyApplicationOwnership(
  applicationId: string,
  userId: string,
) {
  const application =
    await prisma.loanApplication.findFirst({
      where: {
        id: applicationId,
        userId,
      },

      select: {
        id: true,
        userId: true,
        status: true,
        loanProductId: true,
      },
    });

  if (!application) {
    throw new Error(
      "Loan application not found.",
    );
  }

  return application;
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
export async function createApplicationDocument(
  userId: string,
  applicationId: string,
  data: {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  },
) {
  /*
   * Confirm the application belongs to the user.
   */
  await verifyApplicationOwnership(
    applicationId,
    userId,
  );

  /*
   * Check if there is already an application
   * form uploaded for this application.
   */
  const existing =
    await prisma.document.findFirst({
      where: {
        applicationId,

        /*
         * If your DocumentType enum uses a
         * different name, change this value.
         */
        type: "APPLICATION_FORM" as any,
      },
    });

  /*
   * If an old document exists, we don't delete it.
   *
   * This is useful for audit/history.
   *
   * Instead, mark the old document as rejected/
   * superseded if your schema supports that.
   *
   * For now, we simply create a new document.
   */
  const document =
    await prisma.document.create({
      data: {
        userId,
        applicationId,

        type: "APPLICATION_FORM" as any,

        fileName: data.fileName,
        fileUrl: data.fileUrl,

        fileSize:
          data.fileSize ?? null,

        mimeType:
          data.mimeType ?? null,

        status: "PENDING" as any,

        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: null,
      },
    });

  return document;
}

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

  if (document.userId !== userId) {
    throw new Error(
      "You do not have permission to delete this document.",
    );
  }

  return prisma.document.delete({
    where: {
      id: documentId,
    },
  });
}