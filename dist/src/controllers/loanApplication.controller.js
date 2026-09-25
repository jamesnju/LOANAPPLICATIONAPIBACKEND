import { idParamSchema } from "../schemas/kyc.schema.js";
import { createLoanApplicationSchema, loanApplicationQuerySchema, cancelLoanApplicationSchema } from "../schemas/loanApplication.schema.js";
import { createLoanApplication, getCustomerLoanApplications, getCustomerLoanApplication, cancelLoanApplication } from "../services/loanApplication.service.js";
function getUserId(req) {
    const user = req.user;
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    return user.id;
}
/*
 * POST /api/v1/loan-applications
 */
export async function createLoanApplicationController(req, res) {
    try {
        const customerId = getUserId(req);
        const data = createLoanApplicationSchema.parse(req.body);
        const application = await createLoanApplication(customerId, data);
        return res.status(201).json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * GET /api/v1/loan-applications
 */
export async function getCustomerLoanApplicationsController(req, res) {
    try {
        const customerId = getUserId(req);
        const query = loanApplicationQuerySchema.parse(req.query);
        const result = await getCustomerLoanApplications(customerId, query);
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * GET /api/v1/loan-applications/:id
 */
export async function getCustomerLoanApplicationController(req, res) {
    try {
        const customerId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        const application = await getCustomerLoanApplication(customerId, id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Loan application not found",
            });
        }
        return res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * PATCH /api/v1/loan-applications/:id/cancel
 */
export async function cancelLoanApplicationController(req, res) {
    try {
        const customerId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        const data = cancelLoanApplicationSchema.parse(req.body);
        const application = await cancelLoanApplication(customerId, id, data);
        return res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
//# sourceMappingURL=loanApplication.controller.js.map