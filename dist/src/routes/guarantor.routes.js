import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { createGuarantor, deleteGuarantor, getApplicationGuarantors, getGuarantorById, updateGuarantor, uploadGuarantorIdPhoto, verifyGuarantor, } from "../controllers/guarantor.controller.js";
import { idPhotoUpload } from "../middleware/documentUpload.middleware.js";
const router = Router();
router.use(authenticate);
router.post("/application/:applicationId", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN"), createGuarantor);
router.get("/application/:applicationId", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN", "SUPPORT"), getApplicationGuarantors);
router.get("/:id", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN", "SUPPORT"), getGuarantorById);
router.patch("/:id", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN"), updateGuarantor);
router.patch("/:id/verify", authorize("LOAN_OFFICER", "ADMIN"), verifyGuarantor);
router.delete("/:id", authorize("CUSTOMER", "ADMIN"), deleteGuarantor);
router.post("/:id/id-photo", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN"), idPhotoUpload.single("file"), uploadGuarantorIdPhoto);
router.post("/:id/id-photo", authorize("CUSTOMER", "LOAN_OFFICER", "ADMIN"), idPhotoUpload.single("file"), uploadGuarantorIdPhoto);
export default router;
//# sourceMappingURL=guarantor.routes.js.map