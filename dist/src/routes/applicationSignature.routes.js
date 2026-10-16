import { Router } from "express";
import { signApplicationController, verifySignatureController, getApplicationPdfController, getSignatureController, } from "../controllers/applicationSignature.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
/* PUBLIC — verifies a document hash, no auth needed */
router.get("/verify", verifySignatureController);
/* AUTHENTICATED */
router.post("/:id/sign", authenticate, signApplicationController);
router.get("/:id/signature", authenticate, getSignatureController);
router.get("/:id/pdf", authenticate, getApplicationPdfController);
export default router;
//# sourceMappingURL=applicationSignature.routes.js.map