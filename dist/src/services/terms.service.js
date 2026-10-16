import { createHash } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { logAction } from "./auditLog.service.js";
/* ============================================================
 * HASH
 * ============================================================
 * Hash of the terms body. Same canonicalisation as the
 * application signature so hashes are comparable.
 * ============================================================ */
function hashContent(body) {
    return createHash("sha256").update(body.trim()).digest("hex");
}
/* ============================================================
 * GET PUBLISHED TERMS
 * ============================================================
 * The one version customers see and agree to.
 * ============================================================ */
export async function getPublishedTerms() {
    const terms = await prisma.termsDocument.findFirst({
        where: { isPublished: true },
        orderBy: { version: "desc" },
        select: {
            id: true,
            version: true,
            label: true,
            body: true,
            contentHash: true,
            publishedAt: true,
        },
    });
    return terms;
}
/* ============================================================
 * GET ALL VERSIONS (admin)
 * ============================================================ */
export async function listTermsVersions() {
    return prisma.termsDocument.findMany({
        orderBy: { version: "desc" },
        select: {
            id: true,
            version: true,
            label: true,
            isPublished: true,
            contentHash: true,
            publishedAt: true,
            createdAt: true,
            editor: {
                select: { firstName: true, lastName: true, email: true },
            },
        },
    });
}
/* ============================================================
 * GET ONE VERSION (admin)
 * ============================================================ */
export async function getTermsById(id) {
    const terms = await prisma.termsDocument.findUnique({
        where: { id },
        include: {
            editor: {
                select: { firstName: true, lastName: true, email: true },
            },
        },
    });
    if (!terms)
        throw new Error("Terms not found");
    return terms;
}
/* ============================================================
 * CREATE NEW VERSION (admin)
 * ============================================================
 * Every save creates a new row. The previous published version
 * is automatically unpublished.
 * ============================================================ */
export async function createTermsVersion(adminUserId, input) {
    if (!input.body.trim()) {
        throw new Error("Terms body cannot be empty");
    }
    /* Find the highest version number */
    const latest = await prisma.termsDocument.findFirst({
        orderBy: { version: "desc" },
        select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const contentHash = hashContent(input.body);
    const result = await prisma.$transaction(async (tx) => {
        /* If publishing, unpublish all existing versions first. */
        if (input.publish) {
            await tx.termsDocument.updateMany({
                where: { isPublished: true },
                data: { isPublished: false },
            });
        }
        const created = await tx.termsDocument.create({
            data: {
                version: nextVersion,
                label: input.label.trim() || `Version ${nextVersion}`,
                body: input.body,
                isPublished: input.publish,
                contentHash,
                editedById: adminUserId,
                publishedAt: input.publish ? new Date() : null,
            },
        });
        return created;
    });
    await logAction({
        userId: adminUserId,
        action: "CREATE",
        entity: "TermsDocument",
        entityId: result.id,
        description: `Created terms version ${nextVersion}${input.publish ? " (published)" : ""}`,
        newValue: { version: nextVersion, contentHash },
    });
    return result;
}
/* ============================================================
 * PUBLISH AN EXISTING VERSION (admin)
 * ============================================================
 * Useful for reverting to a prior version.
 * ============================================================ */
export async function publishTermsVersion(adminUserId, id) {
    const terms = await prisma.termsDocument.findUnique({
        where: { id },
    });
    if (!terms)
        throw new Error("Terms not found");
    const result = await prisma.$transaction(async (tx) => {
        await tx.termsDocument.updateMany({
            where: { isPublished: true },
            data: { isPublished: false },
        });
        return tx.termsDocument.update({
            where: { id },
            data: { isPublished: true, publishedAt: new Date() },
        });
    });
    await logAction({
        userId: adminUserId,
        action: "UPDATE",
        entity: "TermsDocument",
        entityId: id,
        description: `Published terms version ${terms.version}`,
    });
    return result;
}
/* ============================================================
 * DELETE A VERSION (admin)
 * ============================================================
 * Only allows deleting unpublished versions. A version that
 * was ever signed must be kept for legal retention.
 * ============================================================ */
export async function deleteTermsVersion(adminUserId, id) {
    const terms = await prisma.termsDocument.findUnique({
        where: { id },
    });
    if (!terms)
        throw new Error("Terms not found");
    if (terms.isPublished) {
        throw new Error("Cannot delete the currently published version. Publish a different version first.");
    }
    /* Check if any signature references this version. */
    const signaturesUsingIt = await prisma.applicationSignature.count({
        where: { termsVersion: terms.version },
    });
    if (signaturesUsingIt > 0) {
        throw new Error(`This version was signed by ${signaturesUsingIt} customer(s) and cannot be deleted for legal retention.`);
    }
    await prisma.termsDocument.delete({ where: { id } });
    await logAction({
        userId: adminUserId,
        action: "DELETE",
        entity: "TermsDocument",
        entityId: id,
        description: `Deleted unpublished terms version ${terms.version}`,
    });
    return { deleted: true };
}
//# sourceMappingURL=terms.service.js.map