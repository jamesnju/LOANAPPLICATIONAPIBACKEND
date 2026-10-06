import { getAdminDashboard, getCustomerDashboard } from "../services/dashboard.service.js";
/* ============================================================
 * CUSTOMER DASHBOARD
 * GET /api/v1/dashboard/customer
 * ==========================================================*/
export async function getCustomerDashboardController(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }
        const data = await getCustomerDashboard(userId);
        return res.json({
            success: true,
            message: "Customer dashboard retrieved successfully",
            data,
        });
    }
    catch (error) {
        console.error("[getCustomerDashboard]", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to load customer dashboard",
        });
    }
}
/* ============================================================
 * ADMIN DASHBOARD
 * GET /api/v1/dashboard/admin
 * ==========================================================*/
export async function getAdminDashboardController(req, res) {
    try {
        const data = await getAdminDashboard();
        return res.json({
            success: true,
            message: "Admin dashboard retrieved successfully",
            data,
        });
    }
    catch (error) {
        console.error("[getAdminDashboard]", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to load admin dashboard",
        });
    }
}
//# sourceMappingURL=dashboard.controller.js.map