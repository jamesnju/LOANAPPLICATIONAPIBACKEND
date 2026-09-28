import type {
  Request,
  Response,
} from "express";

import {
  createPayment,
  getPaymentById,
  getMyPayments,
  getLoanPayments,
} from "../services/payment.service.js";

import {
  createPaymentSchema,
} from "../schemas/payment.schema.js";


/*
 * ============================================================
 * CREATE PAYMENT
 * ============================================================
 */

export const createPaymentController =
  async (
    req: Request,
    res: Response,
  ) => {

    try {

      const data =
        createPaymentSchema.parse(req.body);


      const result =
        await createPayment(
          req.user!.userId,
          data,
        );


      return res.status(201).json({
        success: true,

        message:
          "Payment recorded successfully",

        data: result,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };


/*
 * ============================================================
 * GET PAYMENT
 * ============================================================
 */

export const getPaymentController =
  async (
    req: Request<{ id: string }>,
    res: Response,
  ) => {

    try {

      const payment =
        await getPaymentById(
          req.params.id,
          req.user!.userId,
        );


      return res.status(200).json({
        success: true,
        data: payment,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };


/*
 * ============================================================
 * GET MY PAYMENTS
 * ============================================================
 */

export const getMyPaymentsController =
  async (
    req: Request,
    res: Response,
  ) => {

    try {

      const payments =
        await getMyPayments(
          req.user!.userId,
        );


      return res.status(200).json({
        success: true,
        data: payments,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };


/*
 * ============================================================
 * GET LOAN PAYMENTS
 * ============================================================
 */

export const getLoanPaymentsController =
  async (
    req: Request<{ loanId: string }>,
    res: Response,
  ) => {

    try {

      const payments =
        await getLoanPayments(
          req.params.loanId,
          req.user!.userId,
        );


      return res.status(200).json({
        success: true,
        data: payments,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };