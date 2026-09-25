import type {
  Request,
  Response,
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
 * ROUTE PARAMETER HELPER
 * ============================================================
 *
 * Express can type route parameters as:
 *
 * string | string[]
 *
 * Our service requires a normal string.
 *
 * This helper safely converts the value to a string.
 */
function getRouteParam(
  value: string | string[] | undefined
): string | null {

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}


/*
 * ============================================================
 * CREATE LOAN PRODUCT
 * ============================================================
 */
export async function createLoanProduct(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const data =
      createLoanProductSchema.parse(
        req.body
      );


    const product =
      await createProduct(data);


    res.status(201).json({
      success: true,
      message: "Loan product created successfully",
      data: product,
    });

  } catch (error) {

    console.error(error);


    if (
      error instanceof Error &&
      error.message ===
        "LOAN_PRODUCT_ALREADY_EXISTS"
    ) {

      res.status(409).json({
        success: false,
        message: "Loan product already exists",
      });

      return;
    }


    res.status(400).json({
      success: false,
      message: "Unable to create loan product",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

  }

}


/*
 * ============================================================
 * GET ALL LOAN PRODUCTS
 * ============================================================
 */
export async function getAllLoanProducts(
  _req: Request,
  res: Response
): Promise<void> {

  try {

    const products =
      await getLoanProducts();


    res.status(200).json({
      success: true,
      data: products,
    });

  } catch (error) {

    console.error(error);


    res.status(500).json({
      success: false,
      message: "Unable to retrieve loan products",
    });

  }

}


/*
 * ============================================================
 * GET ACTIVE LOAN PRODUCTS
 * ============================================================
 */
export async function getActiveProducts(
  _req: Request,
  res: Response
): Promise<void> {

  try {

    const products =
      await getActiveLoanProducts();


    res.status(200).json({
      success: true,
      data: products,
    });

  } catch (error) {

    console.error(error);


    res.status(500).json({
      success: false,
      message: "Unable to retrieve active loan products",
    });

  }

}


/*
 * ============================================================
 * GET ONE LOAN PRODUCT
 * ============================================================
 */
export async function getOneLoanProduct(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const id =
      getRouteParam(req.params.id);


    /*
     * Make sure an ID was actually supplied.
     */
    if (!id) {

      res.status(400).json({
        success: false,
        message: "Loan product ID is required",
      });

      return;
    }


    const product =
      await getLoanProductById(id);


    if (!product) {

      res.status(404).json({
        success: false,
        message: "Loan product not found",
      });

      return;
    }


    res.status(200).json({
      success: true,
      data: product,
    });

  } catch (error) {

    console.error(error);


    res.status(500).json({
      success: false,
      message: "Unable to retrieve loan product",
    });

  }

}


/*
 * ============================================================
 * UPDATE LOAN PRODUCT
 * ============================================================
 */
export async function updateLoanProduct(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const id =
      getRouteParam(req.params.id);


    if (!id) {

      res.status(400).json({
        success: false,
        message: "Loan product ID is required",
      });

      return;
    }


    const data =
      updateLoanProductSchema.parse(
        req.body
      );


    const product =
      await updateProduct(
        id,
        data
      );


    res.status(200).json({
      success: true,
      message: "Loan product updated successfully",
      data: product,
    });

  } catch (error) {

    console.error(error);


    if (
      error instanceof Error &&
      error.message ===
        "LOAN_PRODUCT_NOT_FOUND"
    ) {

      res.status(404).json({
        success: false,
        message: "Loan product not found",
      });

      return;
    }


    res.status(400).json({
      success: false,
      message: "Unable to update loan product",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

  }

}


/*
 * ============================================================
 * DELETE LOAN PRODUCT
 * ============================================================
 */
export async function deleteLoanProduct(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const id =
      getRouteParam(req.params.id);


    if (!id) {

      res.status(400).json({
        success: false,
        message: "Loan product ID is required",
      });

      return;
    }


    await deleteProduct(id);


    res.status(200).json({
      success: true,
      message: "Loan product deleted successfully",
    });

  } catch (error) {

    console.error(error);


    if (
      error instanceof Error &&
      error.message ===
        "LOAN_PRODUCT_NOT_FOUND"
    ) {

      res.status(404).json({
        success: false,
        message: "Loan product not found",
      });

      return;
    }


    res.status(500).json({
      success: false,
      message: "Unable to delete loan product",
    });

  }

}