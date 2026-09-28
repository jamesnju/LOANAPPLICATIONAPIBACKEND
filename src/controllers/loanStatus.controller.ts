import type {
  Request,
  Response,
} from "express";

import {
  getLoanStatus,
  updateLoanStatus,
  updateAllOverdueLoans,
} from "../services/loanStatus.service.js";


/*
 * ============================================================
 * GET LOAN STATUS
 * ============================================================
 */

export const getLoanStatusController =
  async (
    req: Request<{ id: string }>,
    res: Response,
  ) => {

    try {

      const loan =
        await getLoanStatus(
          req.params.id,
          req.user!.userId,
        );


      return res.status(200).json({
        success: true,
        data: loan,
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
 * UPDATE SINGLE LOAN STATUS
 * ============================================================
 */

export const updateLoanStatusController =
  async (
    req: Request<{ id: string }>,
    res: Response,
  ) => {

    try {

      const loan =
        await updateLoanStatus(
          req.params.id,
        );


      return res.status(200).json({
        success: true,

        message:
          "Loan status updated successfully",

        data: loan,
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
 * UPDATE ALL OVERDUE LOANS
 * ============================================================
 */

export const updateAllOverdueLoansController =
  async (
    req: Request,
    res: Response,
  ) => {

    try {

      const result =
        await updateAllOverdueLoans();


      return res.status(200).json({
        success: true,

        message:
          "Overdue loans updated successfully",

        data: result,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };