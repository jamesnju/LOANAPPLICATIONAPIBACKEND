import { getApplicationTemplate, verifyApplicationOwnership, createApplicationDocument, getApplicationDocuments, getDocumentById as getDocument, verifyDocument as verifyDocumentService, rejectDocument as rejectDocumentService, deleteDocument as deleteDocumentService, } from "../services/document.service.js";
import { uploadDocument, } from "../services/cloudinary.service.js";
import { rejectDocumentSchema, } from "../schemas/document.schema.js";
function getParam(value) {
    if (!value) {
        return null;
    }
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
}
/*
 * GET
 *
 * Download the official KOPAFLEX
 * application form.
 */
export async function downloadApplicationTemplate(_req, res) {
    try {
        const filePath = getApplicationTemplate();
        res.download(filePath, "KOPAFLEX APPLICATION FORM.docx", (error) => {
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
 * POST
 *
 * Upload completed application form.
 *
 * multipart/form-data
 *
 * field name:
 * file
 */
export async function uploadApplicationDocument(req, res) {
    try {
        const applicationId = getParam(req.params.applicationId);
        if (!applicationId) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
            return;
        }
        /*
         * Multer puts the uploaded file
         * into req.file.
         */
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "Please upload the completed application form.",
            });
            return;
        }
        /*
         * Verify application ownership.
         */
        await verifyApplicationOwnership(applicationId, req.user.userId);
        /*
         * Upload DOCX to Cloudinary.
         */
        const uploaded = await uploadDocument(req.file.buffer, req.file.originalname);
        /*
         * Save document record in PostgreSQL.
         */
        const document = await createApplicationDocument(req.user.userId, applicationId, {
            fileName: req.file.originalname,
            fileUrl: uploaded.secure_url,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
        });
        res.status(201).json({
            success: true,
            message: "Loan application document uploaded successfully.",
            data: document,
        });
    }
    catch (error) {
        console.error("Application document upload error:", error);
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to upload application document",
        });
    }
}
/*
 * Get documents belonging to an application.
 */
export async function getApplicationDocumentsController(req, res) {
    try {
        const applicationId = getParam(req.params.applicationId);
        if (!applicationId) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
            return;
        }
        const staffRoles = [
            "SUPER_ADMIN",
            "ADMIN",
            "LOAN_OFFICER",
            "SUPPORT",
        ];
        const isStaff = staffRoles.includes(req.user.role);
        const documents = await getApplicationDocuments(applicationId, req.user.userId, isStaff);
        res.status(200).json({
            success: true,
            data: documents,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get application documents",
        });
    }
}
/*
 * Get one document.
 */
export async function getDocumentById(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
            return;
        }
        const staffRoles = [
            "SUPER_ADMIN",
            "ADMIN",
            "LOAN_OFFICER",
            "SUPPORT",
        ];
        const isStaff = staffRoles.includes(req.user.role);
        const document = await getDocument(id, req.user.userId, isStaff);
        res.status(200).json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Document not found",
        });
    }
}
/*
 * Verify document.
 */
export async function verifyDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
            return;
        }
        const document = await verifyDocumentService(id, req.user.userId);
        res.status(200).json({
            success: true,
            message: "Application document verified successfully.",
            data: document,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to verify document",
        });
    }
}
/*
 * Reject document.
 */
export async function rejectDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
            return;
        }
        const { rejectionReason, } = rejectDocumentSchema.parse(req.body);
        const document = await rejectDocumentService(id, req.user.userId, rejectionReason);
        res.status(200).json({
            success: true,
            message: "Application document rejected.",
            data: document,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to reject document",
        });
    }
}
/*
 * Delete document.
 */
export async function deleteDocument(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
            return;
        }
        await deleteDocumentService(id, req.user.userId);
        res.status(200).json({
            success: true,
            message: "Document deleted successfully.",
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to delete document",
        });
    }
}
//# sourceMappingURL=document.controller.js.map