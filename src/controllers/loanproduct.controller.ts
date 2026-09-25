import type {
Request,
Response,
NextFunction,
} from "express";

import {
createLoanProduct as createProduct,
getLoanProducts,
getActiveLoanProducts,
getLoanProductById,
updateLoanProduct as updateProduct,
deleteLoanProduct as deleteProduct,
} from "../services/loan-product.service.js";

import {
createLoanProductSchema,
updateLoanProductSchema,
} from "../schemas/loanproduct.schema.js";

/*

* ============================================================
* GET ID PARAMETER
* ============================================================
  */
  const getIdParam = (
  req: Request,
  res: Response
  ): string | null => {

const id = req.params.id;

/*

* Express may type this as string | string[].
*
* We only accept a single string.
  */
  if (typeof id !== "string" || id.trim() === "") {


res.status(400).json({

  success: false,
  message: "Invalid loan product ID",
});

return null;


}

return id;
};

/*

* ============================================================
* CREATE LOAN PRODUCT
* ============================================================
*
* POST /api/v1/loan-products
  */
  export const createLoanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


/*
 * Validate request body.
 */
const data =
  createLoanProductSchema.parse(req.body);

/*
 * Create product.
 */
const product =
  await createProduct(data);

return res.status(201).json({
  success: true,
  message:
    "Loan product created successfully",
  data: product,
});


} catch (error) {


next(error);


}
};

/*

* ============================================================
* GET ACTIVE LOAN PRODUCTS
* ============================================================
*
* GET /api/v1/loan-products/active
  */
  export const getActiveProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


const products =
  await getActiveLoanProducts();

return res.status(200).json({
  success: true,
  data: products,
});


} catch (error) {


next(error);


}
};

/*

* ============================================================
* GET ALL LOAN PRODUCTS
* ============================================================
*
* GET /api/v1/loan-products
  */
  export const getAllLoanProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


const products =
  await getLoanProducts();

return res.status(200).json({
  success: true,
  data: products,
});


} catch (error) {

next(error);


}
};

/*

* ============================================================
* GET ONE LOAN PRODUCT
* ============================================================
*
* GET /api/v1/loan-products/:id
  */
  export const getOneLoanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


const id =
  getIdParam(req, res);

if (!id) {
  return;
}

const product =
  await getLoanProductById(id);

return res.status(200).json({
  success: true,
  data: product,
});


} catch (error) {

next(error);

}
};

/*

* ============================================================
* UPDATE LOAN PRODUCT
* ============================================================
*
* PUT /api/v1/loan-products/:id
  */
  export const updateLoanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


const id =
  getIdParam(req, res);

if (!id) {
  return;
}

/*
 * Validate request body.
 */
const data =
  updateLoanProductSchema.parse(req.body);

/*
 * Update product.
 */
const product =
  await updateProduct(id, data);

return res.status(200).json({
  success: true,
  message:
    "Loan product updated successfully",
  data: product,
});

} catch (error) {


next(error);

}
};

/*

* ============================================================
* DELETE LOAN PRODUCT
* ============================================================
*
* DELETE /api/v1/loan-products/:id
  */
  export const deleteLoanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
  ) => {

try {


const id =
  getIdParam(req, res);

if (!id) {
  return;
}

/*
 * Delete product.
 */
await deleteProduct(id);

return res.status(200).json({
  success: true,
  message:
    "Loan product deleted successfully",
});


} catch (error) {

next(error);


}
};
