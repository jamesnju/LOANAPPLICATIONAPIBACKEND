import { prisma } from "../config/prisma.js";

export async function createCollateral(
  applicationId: string,
  data: any,
) {
  const application =
    await prisma.loanApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

  if (!application) {
    throw new Error(
      "Loan application not found",
    );
  }

  return prisma.collateral.create({
    data: {
      applicationId,
      ...data,
    },
  });
}

export async function getApplicationCollateral(
  applicationId: string,
) {
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

export async function getCollateralById(
  id: string,
) {
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

export async function updateCollateral(
  id: string,
  data: any,
) {
  return prisma.collateral.update({
    where: {
      id,
    },

    data,
  });
}

export async function verifyCollateral(
  id: string,
  verified: boolean,
) {
  return prisma.collateral.update({
    where: {
      id,
    },

    data: {
      verified,
    },
  });
}

export async function deleteCollateral(
  id: string,
) {
  return prisma.collateral.delete({
    where: {
      id,
    },
  });
}