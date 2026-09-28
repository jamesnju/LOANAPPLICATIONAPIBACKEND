import { createCollateralSchema, updateCollateralSchema, verifyCollateralSchema, } from "../schemas/collateral.schema.js";
import * as service from "../services/collateral.service.js";
function param(value) {
    if (!value)
        return null;
    return Array.isArray(value)
        ? value[0] ?? null
        : value;
}
export async function createCollateral(req, res) {
    try {
        const applicationId = param(req.params.applicationId);
        if (!applicationId) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
            return;
        }
        const data = createCollateralSchema.parse(req.body);
        const collateral = await service.createCollateral(applicationId, data);
        res.status(201).json({
            success: true,
            message: "Collateral created successfully",
            data: collateral,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create collateral",
        });
    }
}
export async function getApplicationCollateral(req, res) {
    try {
        const applicationId = param(req.params.applicationId);
        if (!applicationId) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
            });
            return;
        }
        const collateral = await service.getApplicationCollateral(applicationId);
        res.json({
            success: true,
            data: collateral,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get collateral",
        });
    }
}
export async function getCollateralById(req, res) {
    try {
        const id = param(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid collateral ID",
            });
            return;
        }
        const collateral = await service.getCollateralById(id);
        if (!collateral) {
            res.status(404).json({
                success: false,
                message: "Collateral not found",
            });
            return;
        }
        res.json({
            success: true,
            data: collateral,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get collateral",
        });
    }
}
export async function updateCollateral(req, res) {
    try {
        const id = param(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid collateral ID",
            });
            return;
        }
        const data = updateCollateralSchema.parse(req.body);
        const collateral = await service.updateCollateral(id, data);
        res.json({
            success: true,
            message: "Collateral updated successfully",
            data: collateral,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update collateral",
        });
    }
}
export async function verifyCollateral(req, res) {
    try {
        const id = param(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid collateral ID",
            });
            return;
        }
        const { verified } = verifyCollateralSchema.parse(req.body);
        const collateral = await service.verifyCollateral(id, verified);
        res.json({
            success: true,
            message: "Collateral verification updated",
            data: collateral,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to verify collateral",
        });
    }
}
export async function deleteCollateral(req, res) {
    try {
        const id = param(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid collateral ID",
            });
            return;
        }
        await service.deleteCollateral(id);
        res.json({
            success: true,
            message: "Collateral deleted successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to delete collateral",
        });
    }
}
//# sourceMappingURL=collateral.controller.js.map