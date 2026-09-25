import { createKycSchema, idParamSchema, updateKycSchema, createKycDocumentSchema } from "../schemas/kyc.schema.js";
import { createKyc, getMyKyc, getKycById, updateKyc, addKycDocument, deleteKycDocument } from "../services/kyc.service.js";
function getUserId(req) {
    const user = req.user;
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    return user.id;
}
/*
 * POST /api/v1/kyc
 */
export async function createKycController(req, res) {
    try {
        const userId = getUserId(req);
        const data = createKycSchema.parse(req.body);
        const kyc = await createKyc(userId, data);
        return res.status(201).json({
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
 * GET /api/v1/kyc
 */
export async function getMyKycController(req, res) {
    try {
        const userId = getUserId(req);
        const kyc = await getMyKyc(userId);
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
 * GET /api/v1/kyc/:id
 */
export async function getKycByIdController(req, res) {
    try {
        const userId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        const kyc = await getKycById(userId, id);
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
 * PATCH /api/v1/kyc
 */
export async function updateKycController(req, res) {
    try {
        const userId = getUserId(req);
        const data = updateKycSchema.parse(req.body);
        const kyc = await updateKyc(userId, data);
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
 * POST /api/v1/kyc/documents
 */
export async function addKycDocumentController(req, res) {
    try {
        const userId = getUserId(req);
        const data = createKycDocumentSchema.parse(req.body);
        const document = await addKycDocument(userId, data);
        return res.status(201).json({
            success: true,
            data: document,
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
 * DELETE /api/v1/kyc/documents/:id
 */
export async function deleteKycDocumentController(req, res) {
    try {
        const userId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        await deleteKycDocument(userId, id);
        return res.json({
            success: true,
            message: "KYC document deleted successfully",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
//# sourceMappingURL=kyc.controller.js.map