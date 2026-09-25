import { createSystemConfigSchema, updateSystemConfigSchema, } from "../schemas/system-config.schema.js";
import { createSystemConfig as createConfig, getSystemConfigs, getSystemConfigById, updateSystemConfig as updateConfig, deleteSystemConfig as deleteConfig, } from "../services/systemconfig.service.js";
/*
 * GET ROUTE PARAMETER
 *
 * Express may type req.params.id as:
 * string | string[] | undefined
 *
 * This helper makes sure we get a normal string.
 */
function getRouteParam(value) {
    if (!value) {
        return null;
    }
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
}
/*
 * CREATE SYSTEM CONFIG
 *
 * POST /api/v1/system-config
 */
export async function createSystemConfig(req, res) {
    try {
        /*
         * Validate request body
         */
        const data = createSystemConfigSchema.parse(req.body);
        /*
         * Create configuration
         */
        const config = await createConfig(data);
        res.status(201).json({
            success: true,
            message: "System configuration created successfully",
            data: config,
        });
    }
    catch (error) {
        console.error("Create system config error:", error);
        /*
         * Duplicate configuration
         */
        if (error instanceof Error &&
            error.message === "SYSTEM_CONFIG_ALREADY_EXISTS") {
            res.status(409).json({
                success: false,
                message: "System configuration already exists",
            });
            return;
        }
        /*
         * Validation or other error
         */
        res.status(400).json({
            success: false,
            message: "Unable to create system configuration",
            error: error instanceof Error
                ? error.message
                : "Unknown error",
        });
    }
}
/*
 * GET ALL SYSTEM CONFIGURATIONS
 *
 * GET /api/v1/system-config
 */
export async function getAllSystemConfigs(_req, res) {
    try {
        const configs = await getSystemConfigs();
        res.status(200).json({
            success: true,
            data: configs,
        });
    }
    catch (error) {
        console.error("Get system configs error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve system configurations",
        });
    }
}
/*
 * GET ONE SYSTEM CONFIGURATION
 *
 * GET /api/v1/system-config/:id
 */
export async function getOneSystemConfig(req, res) {
    try {
        /*
         * Get ID from URL
         */
        const id = getRouteParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "System configuration ID is required",
            });
            return;
        }
        /*
         * Find configuration
         */
        const config = await getSystemConfigById(id);
        if (!config) {
            res.status(404).json({
                success: false,
                message: "System configuration not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: config,
        });
    }
    catch (error) {
        console.error("Get system config error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve system configuration",
        });
    }
}
/*
 * UPDATE SYSTEM CONFIGURATION
 *
 * PUT /api/v1/system-config/:id
 */
export async function updateSystemConfig(req, res) {
    try {
        /*
         * Get ID from URL
         */
        const id = getRouteParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "System configuration ID is required",
            });
            return;
        }
        /*
         * Validate request body
         */
        const data = updateSystemConfigSchema.parse(req.body);
        /*
         * Update configuration
         */
        const config = await updateConfig(id, data);
        res.status(200).json({
            success: true,
            message: "System configuration updated successfully",
            data: config,
        });
    }
    catch (error) {
        console.error("Update system config error:", error);
        /*
         * Configuration does not exist
         */
        if (error instanceof Error &&
            error.message ===
                "SYSTEM_CONFIG_NOT_FOUND") {
            res.status(404).json({
                success: false,
                message: "System configuration not found",
            });
            return;
        }
        /*
         * Configuration is protected
         */
        if (error instanceof Error &&
            error.message ===
                "SYSTEM_CONFIG_NOT_EDITABLE") {
            res.status(403).json({
                success: false,
                message: "This configuration cannot be edited",
            });
            return;
        }
        /*
         * Duplicate key
         */
        if (error instanceof Error &&
            error.message ===
                "SYSTEM_CONFIG_ALREADY_EXISTS") {
            res.status(409).json({
                success: false,
                message: "System configuration key already exists",
            });
            return;
        }
        res.status(400).json({
            success: false,
            message: "Unable to update system configuration",
            error: error instanceof Error
                ? error.message
                : "Unknown error",
        });
    }
}
/*
 * DELETE SYSTEM CONFIGURATION
 *
 * DELETE /api/v1/system-config/:id
 */
export async function deleteSystemConfig(req, res) {
    try {
        /*
         * Get ID from URL
         */
        const id = getRouteParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "System configuration ID is required",
            });
            return;
        }
        /*
         * Delete configuration
         */
        await deleteConfig(id);
        res.status(200).json({
            success: true,
            message: "System configuration deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete system config error:", error);
        /*
         * Configuration does not exist
         */
        if (error instanceof Error &&
            error.message ===
                "SYSTEM_CONFIG_NOT_FOUND") {
            res.status(404).json({
                success: false,
                message: "System configuration not found",
            });
            return;
        }
        /*
         * Configuration is protected
         */
        if (error instanceof Error &&
            error.message ===
                "SYSTEM_CONFIG_NOT_EDITABLE") {
            res.status(403).json({
                success: false,
                message: "This configuration cannot be edited",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Unable to delete system configuration",
        });
    }
}
//# sourceMappingURL=system-config.controller.js.map