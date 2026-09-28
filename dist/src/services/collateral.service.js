import { prisma } from "../config/prisma.js";
export async function createCollateral(applicationId, data) {
    const application = await prisma.loanApplication.findUnique({
        where: {
            id: applicationId,
        },
    });
    if (!application) {
        throw new Error("Loan application not found");
    }
    return prisma.collateral.create({
        data: {
            applicationId,
            ...data,
        },
    });
}
export async function getApplicationCollateral(applicationId) {
    return prisma.collateral.findMany({
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
export async function getCollateralById(id) {
    return prisma.collateral.findUnique({
        where: {
            id,
        },
        include: {
            application: true,
            documents: true,
        },
    });
}
export async function updateCollateral(id, data) {
    return prisma.collateral.update({
        where: {
            id,
        },
        data,
    });
}
export async function verifyCollateral(id, verified) {
    return prisma.collateral.update({
        where: {
            id,
        },
        data: {
            verified,
        },
    });
}
export async function deleteCollateral(id) {
    return prisma.collateral.delete({
        where: {
            id,
        },
    });
}
//# sourceMappingURL=collateral.service.js.map