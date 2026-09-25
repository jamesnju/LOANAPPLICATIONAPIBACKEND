import { adminKycQuerySchema, idParamSchema, reviewKycSchema } from "../schemas/kyc.schema.js";
import { getKycList, getAdminKycById, reviewKyc } from "../services/kyc.service.js";
function getUserId(req) {
    const user = req.user;
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    return user.id;
}
/*
 * GET /api/v1/admin/kyc
 */
export async function getAdminKycController(req, res) {
    try {
        const query = adminKycQuerySchema.parse(req.query);
        const result = await getKycList(query);
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
 * GET /api/v1/admin/kyc/:id
 */
export async function getAdminKycByIdController(req, res) {
    try {
        const { id } = idParamSchema.parse(req.params);
        const kyc = await getAdminKycById(id);
        if (!kyc) {
            return res.status(404).json({
                success: false,
                message: "KYC not found",
            });
        }
        return res.json({
            success: true,
            data: kyc,
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
 * PATCH /api/v1/admin/kyc/:id/review
 */
export async function reviewKycController(req, res) {
    try {
        const reviewerId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        const data = reviewKycSchema.parse(req.body);
        const result = await reviewKyc(id, reviewerId, data);
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
//# sourceMappingURL=adminKyc.controller.js.map