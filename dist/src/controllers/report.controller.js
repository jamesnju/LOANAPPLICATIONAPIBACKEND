import { reportDateQuerySchema, } from "../schemas/report.schema.js";
import { getLoanPortfolioReport, getPaymentReport, getOverdueLoanReport, getApplicationReport, } from "../services/report.service.js";
/*
 * LOAN PORTFOLIO
 */
export async function getLoanPortfolioReportController(req, res) {
    try {
        const filters = reportDateQuerySchema.parse(req.query);
        const report = await getLoanPortfolioReport(req.user.userId, filters);
        res.status(200).json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        handleReportError(error, res);
    }
}
/*
 * PAYMENT REPORT
 */
export async function getPaymentReportController(req, res) {
    try {
        const filters = reportDateQuerySchema.parse(req.query);
        const report = await getPaymentReport(req.user.userId, filters);
        res.status(200).json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        handleReportError(error, res);
    }
}
/*
 * OVERDUE REPORT
 */
export async function getOverdueLoanReportController(req, res) {
    try {
        const report = await getOverdueLoanReport(req.user.userId);
        res.status(200).json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        handleReportError(error, res);
    }
}
/*
 * APPLICATION REPORT
 */
export async function getApplicationReportController(req, res) {
    try {
        const filters = reportDateQuerySchema.parse(req.query);
        const report = await getApplicationReport(req.user.userId, filters);
        res.status(200).json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        handleReportError(error, res);
    }
}
/*
 * Common error handler
 */
function handleReportError(error, res) {
    if (error instanceof Error &&
        error.message === "UNAUTHORIZED") {
        res.status(403).json({
            success: false,
            message: "You do not have permission to access reports",
        });
        return;
    }
    res.status(400).json({
        success: false,
        message: "Unable to generate report",
        error: error instanceof Error
            ? error.message
            : "Unknown error",
    });
}
//# sourceMappingURL=report.controller.js.map