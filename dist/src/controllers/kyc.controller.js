import { ZodError } from "zod";
import { createKycSchema, idParamSchema, updateKycSchema, createKycDocumentSchema, } from "../schemas/kyc.schema.js";
import { createKyc, getMyKyc, getKycById, updateKyc, addKycDocument, deleteKycDocument, } from "../services/kyc.service.js";
/*
 * ============================================================
 * HELPERS
 * ============================================================
 */
function getUserId(req) {
    const user = req.user;
    if (!user?.userId)
        throw new Error("Unauthorized");
    return user.userId;
}
/**
 * Normalize any thrown error into a JSON response.
 * Zod errors get flattened to a single readable string.
 */
function handleError(res, error, fallbackStatus = 400) {
    if (error instanceof ZodError) {
        const first = error.issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first
            ? `${path ? `${path}: ` : ""}${first.message}`
            : "Invalid input";
        return res.status(400).json({ success: false, message });
    }
    const message = error instanceof Error ? error.message : "Something went wrong";
    if (message === "Unauthorized") {
        return res.status(401).json({ success: false, message });
    }
    return res.status(fallbackStatus).json({ success: false, message });
}
/*
 * ============================================================
 * POST /api/v1/kyc
 * ============================================================
 */
export async function createKycController(req, res) {
    try {
        const userId = getUserId(req);
        const data = createKycSchema.parse(req.body);
        const kyc = await createKyc(userId, data);
        return res.status(201).json({ success: true, data: kyc });
    }
    catch (error) {
        return handleError(res, error);
    }
}
/*
 * ============================================================
 * GET /api/v1/kyc  (returns null when not yet created)
 * ============================================================
 */
export async function getMyKycController(req, res) {
    try {
        const userId = getUserId(req);
        const kyc = await getMyKyc(userId);
        // Return 200 with data: null so the frontend can render the form.
        return res.json({ success: true, data: kyc ?? null });
    }
    catch (error) {
        return handleError(res, error);
    }
}
/*
 * ============================================================
 * GET /api/v1/kyc/:id
 * ============================================================
 */
export async function getKycByIdController(req, res) {
    try {
        const userId = getUserId(req);
        const { id } = idParamSchema.parse(req.params);
        const kyc = await getKycById(userId, id);
        if (!kyc) {
            return res
                .status(404)
                .json({ success: false, message: "KYC not found" });
        }
        return res.json({ success: true, data: kyc });
    }
    catch (error) {
        return handleError(res, error);
    }
}
/*
 * ============================================================
 * PATCH /api/v1/kyc
 * ============================================================
 */
export async function updateKycController(req, res) {
    try {
        const userId = getUserId(req);
        const data = updateKycSchema.parse(req.body);
        const kyc = await updateKyc(userId, data);
        return res.json({ success: true, data: kyc });
    }
    catch (error) {
        return handleError(res, error);
    }
}
/*
 * ============================================================
 * POST /api/v1/kyc/documents
 * ============================================================
 */
export async function addKycDocumentController(req, res) {
    try {
        const userId = getUserId(req);
        const data = createKycDocumentSchema.parse(req.body);
        const document = await addKycDocument(userId, data);
        return res.status(201).json({ success: true, data: document });
    }
    catch (error) {
        return handleError(res, error);
    }
}
/*
 * ============================================================
 * DELETE /api/v1/kyc/documents/:id
 * ============================================================
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
        return handleError(res, error);
    }
}
// import { Request, Response } from "express";
// import { createKycSchema, idParamSchema, updateKycSchema, createKycDocumentSchema } from "../schemas/kyc.schema.js";
// import { createKyc, getMyKyc, getKycById, updateKyc, addKycDocument, deleteKycDocument } from "../services/kyc.service.js";
// function getUserId(req: Request): string {
//   const user = (req as any).user;
//   if (!user?.userId) {           // ✅ read userId
//     throw new Error("Unauthorized");
//   }
//   return user.userId;            // ✅ return userId
// }
// /*
//  * POST /api/v1/kyc
//  */
// export async function createKycController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const data =
//       createKycSchema.parse(req.body);
//     const kyc =
//       await createKyc(userId, data);
//     return res.status(201).json({
//       success: true,
//       data: kyc,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
// /*
//  * GET /api/v1/kyc
//  */
// export async function getMyKycController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const kyc =
//       await getMyKyc(userId);
//     return res.json({
//       success: true,
//       data: kyc,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
// /*
//  * GET /api/v1/kyc/:id
//  */
// export async function getKycByIdController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const { id } =
//       idParamSchema.parse(req.params);
//     const kyc =
//       await getKycById(userId, id);
//     if (!kyc) {
//       return res.status(404).json({
//         success: false,
//         message: "KYC not found",
//       });
//     }
//     return res.json({
//       success: true,
//       data: kyc,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
// /*
//  * PATCH /api/v1/kyc
//  */
// export async function updateKycController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const data =
//       updateKycSchema.parse(req.body);
//     const kyc =
//       await updateKyc(userId, data);
//     return res.json({
//       success: true,
//       data: kyc,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
// /*
//  * POST /api/v1/kyc/documents
//  */
// export async function addKycDocumentController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const data =
//       createKycDocumentSchema.parse(req.body);
//     const document =
//       await addKycDocument(
//         userId,
//         data,
//       );
//     return res.status(201).json({
//       success: true,
//       data: document,
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
// /*
//  * DELETE /api/v1/kyc/documents/:id
//  */
// export async function deleteKycDocumentController(
//   req: Request,
//   res: Response,
// ) {
//   try {
//     const userId = getUserId(req);
//     const { id } =
//       idParamSchema.parse(req.params);
//     await deleteKycDocument(
//       userId,
//       id,
//     );
//     return res.json({
//       success: true,
//       message:
//         "KYC document deleted successfully",
//     });
//   } catch (error: any) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
//# sourceMappingURL=kyc.controller.js.map