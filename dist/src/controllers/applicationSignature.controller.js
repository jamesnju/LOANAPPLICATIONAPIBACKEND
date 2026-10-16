import { signApplication, verifySignature, getApplicationSignature, } from "../services/applicationSignature.service.js";
import { signApplicationSchema, verifySignatureQuerySchema, } from "../schemas/applicationSignature.schema.js";
import { prisma } from "../config/prisma.js";
import { renderApplicationPdf } from "../utils/applicationPdf.js";
import { renderUnsignedApplicationPdf } from "../utils/pdfReport.js";
import { fetchImageBuffers } from "../utils/fetchImage.js";
/* ============================================================
 * CLIENT IP HELPER
 * ============================================================ */
function clientIp(req) {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string")
        return xff.split(",")[0].trim();
    return req.ip;
}
/* ============================================================
 * POST /signatures/:id/sign
 * ============================================================
 * Customer signs the loan application.
 * ============================================================ */
export async function signApplicationController(req, res) {
    try {
        const userId = req.user.userId;
        const applicationId = String(req.params.id);
        const input = signApplicationSchema.parse(req.body);
        /* ── Normalize consent fields ────────────────────────────
         * The Zod schema returns `true` (literal) for these fields,
         * but the service accepts plain `boolean`. Depending on the
         * schema shape, the inferred type may be `true | undefined`,
         * which is not assignable to `boolean`. The strict `=== true`
         * comparisons collapse any value into a clean boolean.
         * Anything not strictly `true` becomes `false`, which the
         * service rejects with a proper error message. */
        const result = await signApplication(applicationId, userId, {
            method: input.method,
            signatureData: input.signatureData,
            agreedToTerms: input.agreedToTerms === true,
            agreedToPrivacy: input.agreedToPrivacy === true,
            agreedToDebit: input.agreedToDebit === true,
            termsVersion: input.termsVersion,
            termsHash: input.termsHash,
            ipAddress: clientIp(req),
            userAgent: req.headers["user-agent"] ?? undefined,
        });
        return res.json({ success: true, data: result });
    }
    catch (error) {
        /* Zod validation error */
        if (error?.issues) {
            return res.status(400).json({
                success: false,
                message: error.issues[0]?.message ?? "Invalid request",
            });
        }
        /* Domain error from signApplication */
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to sign",
        });
    }
}
/* ============================================================
 * GET /signatures/:id/signature
 * ============================================================
 * Fetch the signature record (if any) for an application.
 * Used by the read-only detail page and the admin review page
 * to show the signed state.
 * ============================================================ */
export async function getSignatureController(req, res) {
    try {
        const userId = req.user.userId;
        const applicationId = String(req.params.id);
        const signature = await getApplicationSignature(applicationId, userId);
        if (!signature) {
            return res
                .status(404)
                .json({ success: false, message: "Not signed yet" });
        }
        return res.json({ success: true, data: signature });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed",
        });
    }
}
/* ============================================================
 * GET /signatures/:id/pdf
 * ============================================================
 * Download the application PDF.
 *
 * - If the application is signed, produces the signed PDF with
 *   the signature block, hash, and audit trail.
 * - If not yet signed, produces the unsigned application PDF
 *   with a "NOT YET SIGNED" watermark so it can't be passed off
 *   as a finalized document.
 *
 * Access: the owner of the application (or any admin, checked in
 * the service via a role filter).
 * ============================================================ */
export async function getApplicationPdfController(req, res) {
    try {
        const applicationId = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const isAdmin = [
            "SUPER_ADMIN",
            "ADMIN",
            "LOAN_OFFICER",
            "FINANCE_OFFICER",
            "SUPPORT",
        ].includes(userRole);
        /* ── Load application with all relations, including documents ── */
        const application = await prisma.loanApplication.findFirst({
            where: isAdmin ? { id: applicationId } : { id: applicationId, userId },
            include: {
                user: {
                    include: {
                        kyc: {
                            include: { documents: true },
                        },
                    },
                },
                loanProduct: true,
                signature: true,
                documents: true,
                guarantors: {
                    include: { documents: true },
                },
                collateral: {
                    include: { documents: true },
                },
            },
        });
        if (!application) {
            return res
                .status(404)
                .json({ success: false, message: "Application not found" });
        }
        /* ── Collect every image URL we'll want in the PDF ── */
        const imageUrls = [];
        /* Customer ID (front + back) — from application documents */
        for (const d of application.documents) {
            if ((d.type === "NATIONAL_ID_FRONT" || d.type === "NATIONAL_ID_BACK") &&
                d.fileUrl) {
                imageUrls.push(d.fileUrl);
            }
        }
        /* Also check KYC documents, in case the ID was uploaded during
         * KYC instead of during the application. */
        if (application.user.kyc?.documents) {
            for (const d of application.user.kyc.documents) {
                if (d.fileUrl && /image\//.test(d.mimeType ?? "")) {
                    imageUrls.push(d.fileUrl);
                }
            }
        }
        /* Guarantor IDs */
        for (const g of application.guarantors) {
            for (const d of g.documents ?? []) {
                if ((d.type === "GUARANTOR_ID_FRONT" ||
                    d.type === "GUARANTOR_ID_BACK") &&
                    d.fileUrl) {
                    imageUrls.push(d.fileUrl);
                }
            }
        }
        /* Collateral photos */
        for (const c of application.collateral) {
            for (const d of c.documents ?? []) {
                if (d.fileUrl && /image\//.test(d.mimeType ?? "")) {
                    imageUrls.push(d.fileUrl);
                }
            }
        }
        /* ── Fetch all images in parallel ── */
        const imageBuffers = await fetchImageBuffers(imageUrls);
        /* ── Build signature-with-terms as before ── */
        let signatureWithTerms = application.signature;
        if (application.signature?.termsVersion) {
            const terms = await prisma.termsDocument.findFirst({
                where: { version: application.signature.termsVersion },
                select: { body: true, version: true, label: true },
            });
            signatureWithTerms = {
                ...application.signature,
                termsBody: terms?.body ?? "(Terms text no longer available on this server)",
                termsLabel: terms?.label ?? null,
            };
        }
        /* ── Render ── */
        const doc = signatureWithTerms
            ? renderApplicationPdf({
                application,
                signature: signatureWithTerms,
                hash: signatureWithTerms.documentHash,
                imageBuffers,
            })
            : renderUnsignedApplicationPdf({ application, imageBuffers });
        res.setHeader("Content-Type", "application/pdf");
        const filename = `Application-${application.applicationNumber}${application.signature ? "-signed" : ""}.pdf`;
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        doc.pipe(res);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed",
        });
    }
}
/* ============================================================
 * GET /signatures/verify?hash=...
 * ============================================================
 * PUBLIC — no authentication required.
 * ============================================================ */
export async function verifySignatureController(req, res) {
    try {
        const { hash } = verifySignatureQuerySchema.parse(req.query);
        const result = await verifySignature(hash);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        if (error?.issues) {
            return res.status(400).json({
                success: false,
                message: error.issues[0]?.message ?? "Invalid request",
            });
        }
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to verify",
        });
    }
}
/* ============================================================
 * GET /signatures/:id/pdf
 * ============================================================
 * Stream the signed application PDF to the customer.
 * ============================================================ */
export async function getSignedApplicationPdfController(req, res) {
    try {
        const applicationId = String(req.params.id);
        const userId = req.user.userId;
        /* Load the application with the relations the PDF needs. */
        const application = await prisma.loanApplication.findFirst({
            where: { id: applicationId, userId },
            include: {
                user: true,
                loanProduct: true,
            },
        });
        if (!application) {
            return res
                .status(404)
                .json({ success: false, message: "Application not found" });
        }
        const signature = await getApplicationSignature(applicationId, userId);
        if (!signature) {
            return res
                .status(400)
                .json({ success: false, message: "Application not signed yet" });
        }
        const doc = renderApplicationPdf({
            application,
            signature,
            hash: signature.documentHash,
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Application-${application.applicationNumber}.pdf"`);
        doc.pipe(res);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed",
        });
    }
}
//# sourceMappingURL=applicationSignature.controller.js.map