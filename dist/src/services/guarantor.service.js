import { prisma } from "../config/prisma.js";
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
//# sourceMappingURL=guarantor.service.js.map