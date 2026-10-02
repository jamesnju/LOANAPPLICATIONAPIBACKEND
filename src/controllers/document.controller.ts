// src/controllers/document.controller.ts
import type { Request, Response } from "express";
import type { DocumentType } from "../generated/prisma/enums.js";

import {
  getApplicationTemplate,
  verifyApplicationOwnership,
  verifyGuarantorOwnership,
  verifyCollateralOwnership,
  createApplicationDocument,
  createScopedDocument,
  getApplicationDocuments,
  getDocumentById as getDocument,
  verifyDocument as verifyDocumentService,
  rejectDocument as rejectDocumentService,
  deleteDocument as deleteDocumentService,
} from "../services/document.service.js";

import { uploadDocument } from "../services/cloudinary.service.js";

import {
  uploadDocumentSchema,
  rejectDocumentSchema,
} from "../schemas/document.schema.js";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "LOAN_OFFICER",
  "SUPPORT",
] as const;

function isStaffRole(role: string | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/*
 * ============================================================
 * GET /documents/application-template
 *
 * Download the official KOPAFLEX application form.
 * ============================================================
 */
export async function downloadApplicationTemplate(
  _req: Request,
  res: Response,
) {
  try {
    const filePath = getApplicationTemplate();

    res.download(filePath, "KOPAFLEX APPLICATION FORM.docx", (error) => {
      if (error) {
        console.error("Application template download failed:", error);
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Application template not found",
    });
  }
}

/*
 * ============================================================
 * POST /documents/application/:applicationId/upload
 *
 * Upload the completed KOPAFLEX form against an application.
 * Type is forced to APPLICATION_FORM.
 * ============================================================
 */
export async function uploadApplicationDocument(
  req: Request,
  res: Response,
) {
  try {
    const applicationId = getParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload the completed application form.",
      });
    }

    // Ownership check.
    await verifyApplicationOwnership(applicationId, req.user!.userId);

    // Upload to Cloudinary.
    const uploaded = await uploadDocument(
      req.file.buffer,
      req.file.originalname,
    );

    // Save document record.
    const document = await createApplicationDocument(
      req.user!.userId,
      applicationId,
      {
        fileName: req.file.originalname,
        fileUrl: uploaded.secure_url,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    );

    return res.status(201).json({
      success: true,
      message: "Loan application document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    console.error("Application document upload error:", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload application document",
    });
  }
}

/*
 * ============================================================
 * POST /documents
 *
 * Generic upload — used for:
 *   - guarantor documents (type: GUARANTOR_ID, ...)
 *   - collateral documents (type: COLLATERAL_OWNERSHIP, ...)
 *   - additional application documents (type: PROOF_OF_ADDRESS, ...)
 *
 * Body fields (multipart/form-data):
 *   - type           (required, DocumentType enum)
 *   - applicationId  (optional)
 *   - guarantorId    (optional)
 *   - collateralId   (optional)
 *   - file           (required, the actual file)
 *
 * At least ONE of applicationId / guarantorId / collateralId must be present.
 * ============================================================
 */
export async function uploadScopedDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Validate body. Multer puts text fields into req.body.
    const parsed = uploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid request body",
      });
    }

    const { type, applicationId, guarantorId, collateralId } = parsed.data;

    if (!applicationId && !guarantorId && !collateralId) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one of: applicationId, guarantorId, collateralId.",
      });
    }

    const userId = req.user!.userId;

    // Ownership checks for whichever scopes were provided.
    if (applicationId) {
      await verifyApplicationOwnership(applicationId, userId);
    }
    if (guarantorId) {
      await verifyGuarantorOwnership(guarantorId, userId);
    }
    if (collateralId) {
      await verifyCollateralOwnership(collateralId, userId);
    }

    // Upload to Cloudinary.
    const uploaded = await uploadDocument(
      req.file.buffer,
      req.file.originalname,
    );

    // Save document record.
    const document = await createScopedDocument(userId, {
      type: type as DocumentType,
      applicationId: applicationId ?? null,
      guarantorId: guarantorId ?? null,
      collateralId: collateralId ?? null,
      fileName: req.file.originalname,
      fileUrl: uploaded.secure_url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    console.error("Scoped document upload error:", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to upload document",
    });
  }
}

/*
 * ============================================================
 * GET /documents/application/:applicationId
 * ============================================================
 */
export async function getApplicationDocumentsController(
  req: Request,
  res: Response,
) {
  try {
    const applicationId = getParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    const documents = await getApplicationDocuments(
      applicationId,
      req.user!.userId,
      isStaffRole(req.user!.role),
    );

    return res.status(200).json({ success: true, data: documents });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get application documents",
    });
  }
}

/*
 * ============================================================
 * GET /documents/:id
 * ============================================================
 */
export async function getDocumentById(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const document = await getDocument(
      id,
      req.user!.userId,
      isStaffRole(req.user!.role),
    );

    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Document not found",
    });
  }
}

/*
 * ============================================================
 * PATCH /documents/:id/verify
 * ============================================================
 */
export async function verifyDocument(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const document = await verifyDocumentService(id, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: "Application document verified successfully.",
      data: document,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to verify document",
    });
  }
}

/*
 * ============================================================
 * PATCH /documents/:id/reject
 * ============================================================
 */
export async function rejectDocument(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const { rejectionReason } = rejectDocumentSchema.parse(req.body);

    const document = await rejectDocumentService(
      id,
      req.user!.userId,
      rejectionReason,
    );

    return res.status(200).json({
      success: true,
      message: "Application document rejected.",
      data: document,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to reject document",
    });
  }
}

/*
 * ============================================================
 * DELETE /documents/:id
 * ============================================================
 */
export async function deleteDocument(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    await deleteDocumentService(id, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete document",
    });
  }
}