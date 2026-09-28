import { generateRepaymentSchedule, getLoanRepaymentSchedules, getMyRepaymentSchedules, getRepaymentScheduleById, updateOverdueSchedules, } from "../services/repaymentSchedule.service.js";
/*
 * ============================================================
 * GENERATE REPAYMENT SCHEDULE
 * ============================================================
 *
 * POST
 * /api/v1/repayment-schedules/loan/:loanId/generate
 */
export const generateRepaymentScheduleController = async (req, res) => {
    try {
        const { loanId } = req.params;
        const schedule = await generateRepaymentSchedule(loanId, req.user.userId);
        return res.status(201).json({
            success: true,
            message: "Repayment schedule generated successfully",
            data: schedule,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * GET ALL SCHEDULES FOR A LOAN
 * ============================================================
 *
 * GET
 * /api/v1/repayment-schedules/loan/:loanId
 */
export const getLoanRepaymentSchedulesController = async (req, res) => {
    try {
        const { loanId } = req.params;
        const schedules = await getLoanRepaymentSchedules(loanId, req.user.userId);
        return res.status(200).json({
            success: true,
            data: schedules,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * GET ONE SCHEDULE
 * ============================================================
 *
 * GET
 * /api/v1/repayment-schedules/:id
 */
export const getRepaymentScheduleController = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await getRepaymentScheduleById(id, req.user.userId);
        return res.status(200).json({
            success: true,
            data: schedule,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * GET MY REPAYMENT SCHEDULES
 * ============================================================
 *
 * GET
 * /api/v1/repayment-schedules/me
 */
export const getMyRepaymentSchedulesController = async (req, res) => {
    try {
        const schedules = await getMyRepaymentSchedules(req.user.userId);
        return res.status(200).json({
            success: true,
            data: schedules,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * UPDATE OVERDUE SCHEDULES
 * ============================================================
 *
 * PATCH
 * /api/v1/repayment-schedules/update-overdue
 *
 * This endpoint is temporary/manual.
 *
 * Later this will be handled by a background job.
 */
export const updateOverdueSchedulesController = async (req, res) => {
    try {
        const result = await updateOverdueSchedules();
        return res.status(200).json({
            success: true,
            message: "Overdue repayment schedules updated",
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=repaymentSchedule.controller.js.map