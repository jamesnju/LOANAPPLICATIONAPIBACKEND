import { Router } from "express";


import { authenticate } from "../middleware/auth.middleware.js";
import { createKycController, getMyKycController, getKycByIdController, updateKycController, addKycDocumentController, deleteKycDocumentController } from "../controllers/kyc.controller.js";


const router = Router();

router.use(authenticate);

router.post(
  "/",
  createKycController,
);

router.get(
  "/",
  getMyKycController,
);

router.get(
  "/:id",
  getKycByIdController,
);

router.patch(
  "/",
  updateKycController,
);

router.post(
  "/documents",
  addKycDocumentController,
);

router.delete(
  "/documents/:id",
  deleteKycDocumentController,
);

export default router;
