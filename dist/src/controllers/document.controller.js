import { getApplicationTemplate, verifyApplicationOwnership, verifyGuarantorOwnership, verifyCollateralOwnership, createScopedDocument, getApplicationDocuments, getDocumentById as getDocument, verifyDocument as verifyDocumentService, rejectDocument as rejectDocumentService, deleteDocument as deleteDocumentService, } from "../services/document.service.js";
import { uploadDocument, uploadImage } from "../services/cloudinary.service.js";
import { uploadDocumentSchema, rejectDocumentSchema, } from "../schemas/document.schema.js";
import z from "zod";
/*
 * ============================================================
 * HELPERS
 * ============================================================
 */
function getParam(value) {
    if (!value)
        return null;
    if (Array.isArray(value))
        return value[0] ?? null;
    return value;
}
const STAFF_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "LOAN_OFFICER",
    "SUPPORT",
];
function isStaffRole(role) {
    return !!role && STAFF_ROLES.includes(role);
}
/*
 * ============================================================
 * GET /documents/application-template
 *
 * Download the official KOPAFLEX application form.
 * ============================================================
 */
export async function downloadApplicationTemplate(_req, res) {
    try {
        const filePath = getApplicationTemplate();
        res.download(filePath, "PesaMaishaCapital_TemplateForm.docx", (error) => {
            if (error) {
                console.error("Application template download failed:", error);
            }
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error
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
// backend/src/controllers/document.controller.ts
// Full replacement for the uploadApplicationDocument handler
/*
 * Body shape for POST /documents/application/:applicationId/upload
 *
 * `type` is sent as a form field (multipart) and defaults to
 * APPLICATION_FORM when omitted, so the same endpoint can accept
 * the KOPAFLEX form or National ID photos.
 */
const uploadApplicationDocumentBodySchema = z.object({
    type: z
        .enum([
        "APPLICATION_FORM",
        "NATIONAL_ID_FRONT",
        "NATIONAL_ID_BACK",
        "GUARANTOR_ID_FRONT",
        "GUARANTOR_ID_BACK",
        "PASSPORT",
        "DRIVING_LICENSE",
        "SELFIE",
        "PROOF_OF_ADDRESS",
        "EMPLOYMENT_LETTER",
        "PAYSLIP",
        "BANK_STATEMENT",
        "BUSINESS_LICENSE",
        "KRA_PIN",
        "OTHER",
    ])
        .default("APPLICATION_FORM"),
});
/*
 * Extract a single string from an Express param/query value.
 */
function param(value) {
    if (!value)
        return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}
/*
 * ============================================================
 * POST /api/v1/documents/application/:applicationId/upload
 * ============================================================
 *
 * Multipart form-data:
 *   file  → the DOCX or image
 *   type  → DocumentType (default: APPLICATION_FORM)
 *
 * Access:
 *   CUSTOMER (owner of the application only)
 *
 * Behaviour:
 *   1. Verify the application belongs to the authenticated user.
 *   2. Pick the correct Cloudinary uploader (image vs. raw DOCX).
 *   3. Persist a Document row scoped to the application.
 */
export async function uploadApplicationDocument(req, res) {
    try {
        /* 1. Authenticated user */
        const user = req.user;
        const userId = user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        /* 2. Application id from URL */
        const applicationId = param(req.params.applicationId);
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
        }
        /* 3. Ownership check — customer may only upload to their own application */
        await verifyApplicationOwnership(applicationId, userId);
        /* 4. Validate the optional `type` field */
        const { type } = uploadApplicationDocumentBodySchema.parse({
            type: req.body?.type ?? "APPLICATION_FORM",
        });
        /* 5. File must be present */
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }
        /* 6. Pick the correct Cloudinary uploader */
        const isImage = file.mimetype.startsWith("image/");
        const uploaded = isImage
            ? await uploadImage(file.buffer, file.originalname)
            : await uploadDocument(file.buffer, file.originalname);
        /* 7. Persist the Document row */
        const doc = await createScopedDocument(userId, {
            type: type,
            applicationId,
            fileName: file.originalname,
            fileUrl: uploaded.secure_url,
            fileSize: file.size,
            mimeType: file.mimetype,
        });
        /* 8. Respond */
        return res.status(201).json({
            success: true,
            message: "Application document uploaded successfully",
            data: doc,
        });
    }
    catch (error) {
        /*
         * Zod validation errors come back as `ZodError`.
         * Return the first issue message so the frontend can toast it.
         */
        if (error?.name === "ZodError" && Array.isArray(error.errors)) {
            return res.status(400).json({
                success: false,
                message: error.errors[0]?.message ?? "Validation failed",
                errors: error.errors,
            });
        }
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to upload application document",
        });
    }
}
// export async function uploadApplicationDocument(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const applicationId = getParam(req.params.applicationId);
//     if (!applicationId) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid application ID",
//       });
//     }
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload the completed application form.",
//       });
//     }
//     // Ownership check.
//     await verifyApplicationOwnership(applicationId, req.user!.userId);
//     // Upload to Cloudinary.
//     const uploaded = await uploadDocument(
//       req.file.buffer,
//       req.file.originalname,
//     );
//     // Save document record.
//     const document = await createApplicationDocument(
//       req.user!.userId,
//       applicationId,
//       {
//         fileName: req.file.originalname,
//         fileUrl: uploaded.secure_url,
//         fileSize: req.file.size,
//         mimeType: req.file.mimetype,
//       },
//     );
//     return res.status(201).json({
//       success: true,
//       message: "Loan application document uploaded successfully.",
//       data: document,
//     });
//   } catch (error) {
//     console.error("Application document upload error:", error);
//     return res.status(400).json({
//       success: false,
//       message:
//         error instanceof Error
//           ? error.message
//           : "Failed to upload application document",
//     });
//   }
// }
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
export async function uploadScopedDocument(req, res) {
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
                message: "Provide at least one of: applicationId, guarantorId, collateralId.",
            });
        }
        const userId = req.user.userId;
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
        const uploaded = await uploadDocument(req.file.buffer, req.file.originalname);
        // Save document record.
        const document = await createScopedDocument(userId, {
            type: type,
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
    }
    catch (error) {
        console.error("Scoped document upload error:", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload document",
        });
    }
}
/*
 * ============================================================
 * GET /documents/application/:applicationId
 * ============================================================
 */
export async function getApplicationDocumentsController(req, res) {
    try {
        const applicationId = getParam(req.params.applicationId);
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
        }
        const documents = await getApplicationDocuments(applicationId, req.user.userId, isStaffRole(req.user.role));
        return res.status(200).json({ success: true, data: documents });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error
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
export async function getDocumentById(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }
        const document = await getDocument(id, req.user.userId, isStaffRole(req.user.role));
        return res.status(200).json({ success: true, data: document });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : "Document not found",
        });
    }
}
/*
 * ============================================================
 * PATCH /documents/:id/verify
 * ============================================================
 */
export async function verifyDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }
        const document = await verifyDocumentService(id, req.user.userId);
        return res.status(200).json({
            success: true,
            message: "Application document verified successfully.",
            data: document,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to verify document",
        });
    }
}
/*
 * ============================================================
 * PATCH /documents/:id/reject
 * ============================================================
 */
export async function rejectDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }
        const { rejectionReason } = rejectDocumentSchema.parse(req.body);
        const document = await rejectDocumentService(id, req.user.userId, rejectionReason);
        return res.status(200).json({
            success: true,
            message: "Application document rejected.",
            data: document,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to reject document",
        });
    }
}
/*
 * ============================================================
 * DELETE /documents/:id
 * ============================================================
 */
export async function deleteDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }
        await deleteDocumentService(id, req.user.userId);
        return res.status(200).json({
            success: true,
            message: "Document deleted successfully.",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete document",
        });
    }
}
//# sourceMappingURL=document.controller.js.map