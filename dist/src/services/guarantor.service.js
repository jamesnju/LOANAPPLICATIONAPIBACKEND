import { prisma } from "../config/prisma.js";
import { uploadImage } from "./cloudinary.service.js";
export async function createGuarantor(applicationId, data) {
    const application = await prisma.loanApplication.findUnique({
        where: {
            id: applicationId,
        },
    });
    if (!application) {
        throw new Error("Loan application not found");
    }
    return prisma.guarantor.create({
        data: {
            applicationId,
            ...data,
        },
    });
}
export async function getApplicationGuarantors(applicationId) {
    return prisma.guarantor.findMany({
        where: {
            applicationId,
        },
        include: {
            documents: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
export async function getGuarantorById(id) {
    return prisma.guarantor.findUnique({
        where: {
            id,
        },
        include: {
            application: true,
            documents: true,
        },
    });
}
export async function updateGuarantor(id, data) {
    return prisma.guarantor.update({
        where: {
            id,
        },
        data,
    });
}
export async function verifyGuarantor(id, isVerified) {
    return prisma.guarantor.update({
        where: {
            id,
        },
        data: {
            isVerified,
        },
    });
}
export async function deleteGuarantor(id) {
    return prisma.guarantor.delete({
        where: {
            id,
        },
    });
}
export async function addGuarantorIdPhoto(guarantorId, side, file) {
    const guarantor = await prisma.guarantor.findUnique({
        where: { id: guarantorId },
    });
    if (!guarantor)
        throw new Error("Guarantor not found");
    const uploaded = await uploadImage(file.buffer, file.originalname);
    // Update the guarantor's direct field
    const field = side === "FRONT" ? "idFrontUrl" : "idBackUrl";
    await prisma.guarantor.update({
        where: { id: guarantorId },
        data: { [field]: uploaded.secure_url },
    });
    // Also create a Document row so the officer's review page sees it
    const doc = await prisma.document.create({
        data: {
            userId: guarantor.userId ?? guarantor.applicationId, // fall back if guarantor has no user
            guarantorId,
            type: side === "FRONT"
                ? "GUARANTOR_ID_FRONT"
                : "GUARANTOR_ID_BACK",
            fileName: file.originalname,
            fileUrl: uploaded.secure_url,
            fileSize: file.size,
            mimeType: file.mimetype,
            status: "PENDING",
        },
    });
    return doc;
}
//# sourceMappingURL=guarantor.service.js.map