import { prisma } from "../config/prisma.js";

export async function createGuarantor(
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

  return prisma.guarantor.create({
    data: {
      applicationId,
      ...data,
    },
  });
}

export async function getApplicationGuarantors(
  applicationId: string,
) {
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

export async function getGuarantorById(
  id: string,
) {
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

export async function updateGuarantor(
  id: string,
  data: any,
) {
  return prisma.guarantor.update({
    where: {
      id,
    },

    data,
  });
}

export async function verifyGuarantor(
  id: string,
  isVerified: boolean,
) {
  return prisma.guarantor.update({
    where: {
      id,
    },

    data: {
      isVerified,
    },
  });
}

export async function deleteGuarantor(
  id: string,
) {
  return prisma.guarantor.delete({
    where: {
      id,
    },
  });
}