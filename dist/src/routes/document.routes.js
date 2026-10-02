import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { downloadApplicationTemplate, uploadApplicationDocument, uploadScopedDocument, getApplicationDocumentsController, getDocumentById, verifyDocument, rejectDocument, deleteDocument, } from "../controllers/document.controller.js";
import { applicationDocumentUpload, } from "../middleware/documentUpload.middleware.js";
const router = Router();
router.use(authenticate);
/*
 * ============================================================
 * TEMPLATE
 * ============================================================
 */
router.get("/application-template", authorize("CUSTOMER", "ADMIN", "LOAN_OFFICER"), downloadApplicationTemplate);
/*
 * ============================================================
 * GENERIC SCOPED UPLOAD
 * ============================================================
 */
router.post("/", authorize("CUSTOMER", "ADMIN", "LOAN_OFFICER"), applicationDocumentUpload.single("file"), uploadScopedDocument);
/*
 * ============================================================
 * APPLICATION-FORM UPLOAD
 * ============================================================
 */
router.post("/application/:applicationId/upload", authorize("CUSTOMER"), applicationDocumentUpload.single("file"), uploadApplicationDocument);
/*
 * ============================================================
 * LIST APPLICATION DOCUMENTS
 * ============================================================
 */
router.get("/application/:applicationId", authorize("CUSTOMER", "ADMIN", "LOAN_OFFICER", "SUPPORT"), getApplicationDocumentsController);
/*
 * ============================================================
 * GET ONE
 * ============================================================
 */
router.get("/:id", authorize("CUSTOMER", "ADMIN", "LOAN_OFFICER", "SUPPORT"), getDocumentById);
/*
 * ============================================================
 * VERIFY / REJECT
 * ============================================================
 */
router.patch("/:id/verify", authorize("ADMIN", "LOAN_OFFICER", "SUPER_ADMIN"), verifyDocument);
router.patch("/:id/reject", authorize("ADMIN", "LOAN_OFFICER", "SUPER_ADMIN"), rejectDocument);
/*
 * ============================================================
 * DELETE
 * ============================================================
 */
router.delete("/:id", authorize("CUSTOMER", "ADMIN", "SUPER_ADMIN"), deleteDocument);
export default router;
//# sourceMappingURL=document.routes.js.map