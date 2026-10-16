import { Router } from "express";
import { createTermsVersionController, deleteTermsVersionController, getPublishedTermsController, getTermsByIdController, listTermsVersionsController, publishTermsVersionController, } from "../controllers/terms.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = Router();
/* PUBLIC — customers read the terms before signing. */
router.get("/published", getPublishedTermsController);
/* ADMIN — terms CRUD */
router.get("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), listTermsVersionsController);
router.post("/", authenticate, authorize("SUPER_ADMIN", "ADMIN"), createTermsVersionController);
router.get("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), getTermsByIdController);
router.post("/:id/publish", authenticate, authorize("SUPER_ADMIN", "ADMIN"), publishTermsVersionController);
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), deleteTermsVersionController);
export default router;
//# sourceMappingURL=terms.routes.js.map