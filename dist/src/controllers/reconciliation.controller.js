import { searchStkRequests, getStkRequestDetail, querySafaricomForRequest, manuallyResolveStkRequest, markStkRequestFailed, getReconciliationSummary, } from "../services/reconciliation.service.js";
import { stkSearchQuerySchema, manualResolveSchema, markFailedSchema, } from "../schemas/reconciliation.schema.js";
function handleError(error, res) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (error instanceof Error && error.message === "Not found") {
        return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed",
    });
}
export async function getReconciliationSummaryController(req, res) {
    try {
        const data = await getReconciliationSummary(req.user.userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function searchStkRequestsController(req, res) {
    try {
        const opts = stkSearchQuerySchema.parse(req.query);
        const data = await searchStkRequests(req.user.userId, opts);
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getStkRequestDetailController(req, res) {
    try {
        const data = await getStkRequestDetail(req.user.userId, String(req.params.id));
        res.json({ success: true, data });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function querySafaricomController(req, res) {
    try {
        const result = await querySafaricomForRequest(req.user.userId, String(req.params.id));
        res.json({ success: true, data: result });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function manualResolveController(req, res) {
    try {
        const opts = manualResolveSchema.parse(req.body);
        const result = await manuallyResolveStkRequest(req.user.userId, String(req.params.id), opts);
        res.json({ success: true, data: result });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function markFailedController(req, res) {
    try {
        const opts = markFailedSchema.parse(req.body);
        const result = await markStkRequestFailed(req.user.userId, String(req.params.id), opts);
        res.json({ success: true, data: result });
    }
    catch (error) {
        handleError(error, res);
    }
}
//# sourceMappingURL=reconciliation.controller.js.map