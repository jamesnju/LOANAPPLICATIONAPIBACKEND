import { prisma } from "../config/prisma.js";
/*
 * Create loan product.
 */
export async function createLoanProduct(data) {
    const existing = await prisma.loanProduct.findUnique({
        where: {
            code: data.code,
        },
    });
    if (existing) {
        throw new Error("LOAN_PRODUCT_ALREADY_EXISTS");
    }
    return prisma.loanProduct.create({
        data,
    });
}
/*
 * Get all products.
 */
export async function getLoanProducts() {
    return prisma.loanProduct.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}
/*
 * Get active products.
 */
export async function getActiveLoanProducts() {
    return prisma.loanProduct.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            name: "asc",
        },
    });
}
/*
 * Get one product.
 */
export async function getLoanProductById(id) {
    return prisma.loanProduct.findUnique({
        where: {
            id,
        },
    });
}
/*
 * Update product.
 */
export async function updateLoanProduct(id, data) {
    const product = await prisma.loanProduct.findUnique({
        where: {
            id,
        },
    });
    if (!product) {
        throw new Error("LOAN_PRODUCT_NOT_FOUND");
    }
    return prisma.loanProduct.update({
        where: {
            id,
        },
        data,
    });
}
/*
 * Delete product.
 */
export async function deleteLoanProduct(id) {
    const product = await prisma.loanProduct.findUnique({
        where: {
            id,
        },
    });
    if (!product) {
        throw new Error("LOAN_PRODUCT_NOT_FOUND");
    }
    return prisma.loanProduct.delete({
        where: {
            id,
        },
    });
}
//# sourceMappingURL=loan-product.service.js.map