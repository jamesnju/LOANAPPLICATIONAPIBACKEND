import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
  downloadApplicationTemplate,
  uploadApplicationDocument,
  getApplicationDocumentsController,
  getDocumentById,
  verifyDocument,
  rejectDocument,
  deleteDocument,
} from "../controllers/document.controller.js";

import {
  applicationDocumentUpload,
} from "../middleware/documentUpload.middleware.js";

const router = Router();

/*
 * All document operations require login.
 */
router.use(authenticate);

/*
 * ============================================================
 * APPLICATION FORM TEMPLATE
 * ============================================================
 *
 * Customer downloads the official DOCX.
 */
router.get(
  "/application-template",
  authorize(
    "CUSTOMER",
    "ADMIN",
    "LOAN_OFFICER",
  ),
  downloadApplicationTemplate,
);

/*
 * ============================================================
 * UPLOAD COMPLETED APPLICATION FORM
 * ============================================================
 */
router.post(
  "/application/:applicationId/upload",
  authorize(
    "CUSTOMER",
  ),
  applicationDocumentUpload.single(
    "file",
  ),
  uploadApplicationDocument,
);

/*
 * ============================================================
 * GET APPLICATION DOCUMENTS
 * ============================================================
 */
router.get(
  "/application/:applicationId",
  authorize(
    "CUSTOMER",
    "ADMIN",
    "LOAN_OFFICER",
    "SUPPORT",
  ),
  getApplicationDocumentsController,
);

/*
 * ============================================================
 * GET ONE DOCUMENT
 * ============================================================
 */
router.get(
  "/:id",
  authorize(
    "CUSTOMER",
    "ADMIN",
    "LOAN_OFFICER",
    "SUPPORT",
  ),
  getDocumentById,
);

/*
 * ============================================================
 * VERIFY
 * ============================================================
 */
router.patch(
  "/:id/verify",
  authorize(
    "ADMIN",
    "LOAN_OFFICER",
  ),
  verifyDocument,
);

/*
 * ============================================================
 * REJECT
 * ============================================================
 */
router.patch(
  "/:id/reject",
  authorize(
    "ADMIN",
    "LOAN_OFFICER",
  ),
  rejectDocument,
);

/*
 * ============================================================
 * DELETE
 * ============================================================
 */
router.delete(
  "/:id",
  authorize(
    "CUSTOMER",
    "ADMIN",
  ),
  deleteDocument,
);

export default router;