import { getAnalyticsOverview, getAnalyticsTimeSeries, getProductPerformance, getCohortAnalysis, getActivityFeed, } from "../services/adminAnalytics.service.js";
import { analyticsTimeSeriesQuerySchema } from "../schemas/adminAnalytics.schema.js";
function handleError(error, res) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed",
    });
}
export async function getAnalyticsOverviewController(req, res) {
    try {
        const data = await getAnalyticsOverview(req.user.userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getAnalyticsTimeSeriesController(req, res) {
    try {
        const query = analyticsTimeSeriesQuerySchema.parse(req.query);
        const data = await getAnalyticsTimeSeries(req.user.userId, query);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getProductPerformanceController(req, res) {
    try {
        const data = await getProductPerformance(req.user.userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getCohortAnalysisController(req, res) {
    try {
        const data = await getCohortAnalysis(req.user.userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getActivityFeedController(req, res) {
    try {
        const data = await getActivityFeed(req.user.userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
//# sourceMappingURL=adminAnalytics.controller.js.map