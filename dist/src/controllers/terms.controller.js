import { createTermsVersion, deleteTermsVersion, getPublishedTerms, getTermsById, listTermsVersions, publishTermsVersion, } from "../services/terms.service.js";
function handleError(error, res) {
    return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed",
    });
}
/* PUBLIC — no auth. The customer-facing terms page uses this. */
export async function getPublishedTermsController(_req, res) {
    try {
        const terms = await getPublishedTerms();
        if (!terms) {
            return res
                .status(404)
                .json({ success: false, message: "Terms not yet published" });
        }
        return res.json({ success: true, data: terms });
    }
    catch (error) {
        handleError(error, res);
    }
}
/* ADMIN */
export async function listTermsVersionsController(_req, res) {
    try {
        const versions = await listTermsVersions();
        return res.json({ success: true, data: versions });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function getTermsByIdController(req, res) {
    try {
        const terms = await getTermsById(String(req.params.id));
        return res.json({ success: true, data: terms });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function createTermsVersionController(req, res) {
    try {
        const adminId = req.user.userId;
        const { label, body, publish } = req.body;
        const terms = await createTermsVersion(adminId, {
            label,
            body,
            publish: publish === true,
        });
        return res.status(201).json({ success: true, data: terms });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function publishTermsVersionController(req, res) {
    try {
        const adminId = req.user.userId;
        const terms = await publishTermsVersion(adminId, String(req.params.id));
        return res.json({ success: true, data: terms });
    }
    catch (error) {
        handleError(error, res);
    }
}
export async function deleteTermsVersionController(req, res) {
    try {
        const adminId = req.user.userId;
        const result = await deleteTermsVersion(adminId, String(req.params.id));
        return res.json({ success: true, data: result });
    }
    catch (error) {
        handleError(error, res);
    }
}
//# sourceMappingURL=terms.controller.js.map