import { createHash } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { renderApplicationPdfToBuffer, } from "../utils/applicationPdf.js";
import { logAction } from "./auditLog.service.js";
import { sendSignedApplicationEmail } from "./email.service.js";
/* ============================================================
 * CANONICAL PAYLOAD
 * ============================================================
 * The exact set of fields the customer saw and agreed to at
 * signing time. Everything else about the loan is *derived* —
 * so if you ever change a computation later, this hash still
 * reflects what the customer actually signed.
 * ============================================================ */
function buildSignedPayload(application) {
    return {
        applicationNumber: application.applicationNumber,
        customer: {
            firstName: application.user.firstName,
            lastName: application.user.lastName,
            email: application.user.email,
            phone: application.user.phone,
            nationalId: application.user.nationalId,
        },
        loan: {
            productName: application.loanProduct.name,
            productCode: application.loanProduct.code,
            requestedAmount: String(application.requestedAmount),
            requestedDays: application.requestedDays,
            interestRate: String(application.interestRate),
            processingFee: String(application.processingFee),
            purpose: application.purpose,
            description: application.description,
        },
        signedAt: new Date().toISOString(),
    };
}
function hashPayload(payload) {
    /* Canonicalise the JSON before hashing so key order and
     * whitespace don't affect the hash. */
    const json = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash("sha256").update(json).digest("hex");
}
/* ============================================================
 * SIGN
 * ============================================================
 * Called when the customer submits the signing step.
 *
 * Side effects (all inside a single transaction):
 *   1. Creates the ApplicationSignature row.
 *   2. Flips LoanApplication.status → SUBMITTED.
 *   3. Writes a LoanApproval history row.
 *
 * Post-commit (best-effort, does not roll back the sign):
 *   - Audit log
 *   - Notification email with the signed PDF attached
 * ============================================================ */
export async function signApplication(applicationId, userId, input) {
    /* ── 1. Load application with all relations needed for the PDF ── */
    const application = await prisma.loanApplication.findFirst({
        where: { id: applicationId, userId },
        include: {
            user: {
                include: {
                    /* Include KYC so the PDF can show the verified identity. */
                    kyc: true,
                },
            },
            loanProduct: true,
            signature: true,
            guarantors: {
                include: { documents: true },
            },
            collateral: {
                include: { documents: true },
            },
            documents: true,
        },
    });
    if (!application)
        throw new Error("Application not found");
    /* ── 2. Guards ── */
    if (application.signature) {
        throw new Error("This application has already been signed.");
    }
    if (application.status !== "DRAFT" &&
        application.status !== "DOCUMENTS_REQUIRED") {
        throw new Error(`Cannot sign an application in status ${application.status}.`);
    }
    /* Consent guard — all three must be strictly true. */
    if (input.agreedToTerms !== true ||
        input.agreedToPrivacy !== true ||
        input.agreedToDebit !== true) {
        throw new Error("You must agree to all terms before signing.");
    }
    /* Signature data guard. */
    if (input.method === "TYPED_NAME" && !input.signatureData?.trim()) {
        throw new Error("Please type your full name to sign.");
    }
    /* ── 3. Validate the terms version the customer agreed to ──
     *
     * The customer's browser sends the version + hash it rendered.
     * We compare them to the currently published version to catch
     * the case where the admin updated the terms while the customer
     * had the page open. If they don't match, refuse — the customer
     * must reload and review the new version before signing.
     * ──────────────────────────────────────────────────────────── */
    const currentTerms = await prisma.termsDocument.findFirst({
        where: { isPublished: true },
    });
    if (!currentTerms) {
        throw new Error("Terms and conditions are not available. Please contact support.");
    }
    if (input.termsVersion !== currentTerms.version) {
        throw new Error("The terms and conditions have been updated. Please refresh this page and review the current version before signing.");
    }
    if (input.termsHash !== currentTerms.contentHash) {
        throw new Error("The terms and conditions have changed. Please refresh this page and review the current version before signing.");
    }
    /* ── 4. Build canonical payload + hash ── */
    const payload = buildSignedPayload(application);
    const documentHash = hashPayload(payload);
    /* ── 5. Atomic write ──
     *
     * The signature record, the status flip, and the approval
     * history entry must land together or not at all.
     * ──────────────────────────────────────────────────────── */
    const signature = await prisma.$transaction(async (tx) => {
        /* 5a. Persist the signature — with terms reference. */
        const sig = await tx.applicationSignature.create({
            data: {
                applicationId,
                userId,
                documentHash,
                signedPayload: payload,
                method: input.method,
                signatureData: input.signatureData ?? null,
                agreedToTerms: input.agreedToTerms,
                agreedToPrivacy: input.agreedToPrivacy,
                agreedToDebit: input.agreedToDebit,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
                email: application.user.email,
                /* The legal anchor: exact text the customer agreed to. */
                termsVersion: input.termsVersion,
                termsHash: input.termsHash,
            },
        });
        /* 5b. Flip the application to SUBMITTED. */
        await tx.loanApplication.update({
            where: { id: applicationId },
            data: {
                status: "SUBMITTED",
                submittedAt: new Date(),
            },
        });
        /* 5c. Record the submission in the approval history. */
        await tx.loanApproval.create({
            data: {
                applicationId,
                approverId: userId,
                action: "SUBMIT",
                comments: "Application signed and submitted by customer",
            },
        });
        return sig;
    });
    /* ── 6. Audit log (post-commit) ── */
    await logAction({
        userId,
        action: "UPDATE",
        entity: "LoanApplication",
        entityId: applicationId,
        description: `Customer signed application ${application.applicationNumber} (terms v${input.termsVersion})`,
        newValue: {
            documentHash,
            method: input.method,
            signedAt: signature.signedAt,
            termsVersion: input.termsVersion,
            termsHash: input.termsHash,
        },
    });
    /* ── 7. Signed PDF + email (post-commit, best-effort) ──
     *
     * Awaited rather than fire-and-forget so the customer's inbox
     * reflects the signing immediately. If the email fails we log
     * it — the signature is already persisted and irreversible.
     *
     * The PDF embeds:
     *   - Full customer identity (name, ID, DOB, employment)
     *   - Loan terms
     *   - All guarantors with their IDs and contact info
     *   - All collateral items with values
     *   - The full terms text the customer agreed to
     *   - Signature block + SHA-256 integrity hash
     * ──────────────────────────────────────────────────────────── */
    try {
        /* Attach the terms body to the signature object so the PDF
         * renderer can embed the full text. The version + hash stored
         * with the signature prove this text is unmodified. */
        const signatureWithTerms = {
            ...signature,
            termsBody: currentTerms.body,
        };
        const pdf = await renderApplicationPdfToBuffer({
            application,
            signature: signatureWithTerms,
            hash: documentHash,
        });
        await sendSignedApplicationEmail({
            to: application.user.email,
            firstName: application.user.firstName,
            applicationNumber: application.applicationNumber,
            pdf,
        });
    }
    catch (err) {
        console.error("[signApplication] email failed:", err);
    }
    return {
        signatureId: signature.id,
        documentHash,
        signedAt: signature.signedAt,
        termsVersion: input.termsVersion,
    };
}
/* ============================================================
 * VERIFY
 * ============================================================
 * Public verification — anyone with the document hash can
 * confirm it matches what we have on file.
 * ============================================================ */
export async function verifySignature(documentHash) {
    const signature = await prisma.applicationSignature.findFirst({
        where: { documentHash },
        include: {
            application: {
                select: {
                    applicationNumber: true,
                    requestedAmount: true,
                    status: true,
                },
            },
            user: {
                select: { firstName: true, lastName: true },
            },
        },
    });
    if (!signature) {
        return { valid: false, reason: "No signature found for this hash." };
    }
    /* Re-hash the stored payload. If anyone has tampered with the
     * signed_payload JSON in the database, this will fail. */
    const recomputedHash = hashPayload(signature.signedPayload);
    if (recomputedHash !== signature.documentHash) {
        return {
            valid: false,
            reason: "Signature hash does not match stored payload — data may have been altered.",
        };
    }
    return {
        valid: true,
        signature: {
            applicationNumber: signature.application.applicationNumber,
            customerName: `${signature.user.firstName} ${signature.user.lastName}`,
            signedAt: signature.signedAt,
            method: signature.method,
            amount: String(signature.application.requestedAmount),
        },
    };
}
/* ============================================================
 * FETCH
 * ============================================================ */
export async function getApplicationSignature(applicationId, userId) {
    const signature = await prisma.applicationSignature.findFirst({
        where: {
            applicationId,
            /* userId is required here — the caller must ensure the user
             * has access to this application (either the owner, or an
             * admin path that has already verified). */
            ...(userId ? { userId } : {}),
        },
    });
    return signature;
}
//# sourceMappingURL=applicationSignature.service.js.map