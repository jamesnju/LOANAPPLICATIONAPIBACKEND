import { Router } from "express";
import { authenticate, } from "../middleware/auth.middleware.js";
import { authorize, } from "../middleware/role.middleware.js";
import { createLoanProduct, getActiveProducts, getAllLoanProducts, getOneLoanProduct, updateLoanProduct, deleteLoanProduct, } from "../controllers/loanproduct.controller.js";
const router = Router();
/*

* ============================================================
* GET ACTIVE LOAN PRODUCTS
* ============================================================
*
* Public endpoint.
*
* GET /api/v1/loan-products/active
  */
router.get("/active", getActiveProducts);
/*

* ============================================================
* GET ALL LOAN PRODUCTS
* ============================================================
*
* ADMIN, SUPER_ADMIN and LOAN_OFFICER.
*
* GET /api/v1/loan-products
  */
router.get("/", authenticate, authorize("ADMIN", "SUPER_ADMIN", "LOAN_OFFICER"), getAllLoanProducts);
/*

* ============================================================
* GET ONE LOAN PRODUCT
* ============================================================
*
* ADMIN, SUPER_ADMIN and LOAN_OFFICER.
*
* GET /api/v1/loan-products/:id
  */
router.get("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN", "LOAN_OFFICER"), getOneLoanProduct);
/*

* ============================================================
* CREATE LOAN PRODUCT
* ============================================================
*
* ADMIN and SUPER_ADMIN.
*
* POST /api/v1/loan-products
  */
router.post("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), createLoanProduct);
/*

* ============================================================
* UPDATE LOAN PRODUCT
* ============================================================
*
* ADMIN and SUPER_ADMIN.
*
* PUT /api/v1/loan-products/:id
  */
router.put("/:id", authenticate, authorize("ADMIN", "SUPER_ADMIN"), updateLoanProduct);
/*

* ============================================================
* DELETE LOAN PRODUCT
* ============================================================
*
* Only SUPER_ADMIN.
*
* DELETE /api/v1/loan-products/:id
  */
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), deleteLoanProduct);
export default router;
//# sourceMappingURL=loan-product.routes.js.map