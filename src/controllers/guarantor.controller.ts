import type {
  Request,
  Response,
} from "express";

import {
  applicationIdSchema,
  createGuarantorSchema,
  guarantorIdSchema,
  updateGuarantorSchema,
  verifyGuarantorSchema,
} from "../schemas/guarantor.schema.js";

import * as service from "../services/guarantor.service.js";

function param(
  value: string | string[] | undefined,
) {
  if (!value) return null;
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export async function createGuarantor(
  req: Request,
  res: Response,
) {
  try {
    const applicationId =
      param(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
      return;
    }

    applicationIdSchema.parse({
      applicationId,
    });

    const data =
      createGuarantorSchema.parse(
        req.body,
      );

    const guarantor =
      await service.createGuarantor(
        applicationId,
        data,
      );

    res.status(201).json({
      success: true,
      message: "Guarantor created successfully",
      data: guarantor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create guarantor",
    });
  }
}

export async function getApplicationGuarantors(
  req: Request,
  res: Response,
) {
  try {
    const applicationId =
      param(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
      return;
    }

    const guarantors =
      await service.getApplicationGuarantors(
        applicationId,
      );

    res.json({
      success: true,
      data: guarantors,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get guarantors",
    });
  }
}

export async function getGuarantorById(
  req: Request,
  res: Response,
) {
  try {
    const id = param(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid guarantor ID",
      });
      return;
    }

    guarantorIdSchema.parse({ id });

    const guarantor =
      await service.getGuarantorById(id);

    if (!guarantor) {
      res.status(404).json({
        success: false,
        message: "Guarantor not found",
      });
      return;
    }

    res.json({
      success: true,
      data: guarantor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get guarantor",
    });
  }
}

export async function updateGuarantor(
  req: Request,
  res: Response,
) {
  try {
    const id = param(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid guarantor ID",
      });
      return;
    }

    const data =
      updateGuarantorSchema.parse(
        req.body,
      );

    const guarantor =
      await service.updateGuarantor(
        id,
        data,
      );

    res.json({
      success: true,
      message: "Guarantor updated successfully",
      data: guarantor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update guarantor",
    });
  }
}

export async function verifyGuarantor(
  req: Request,
  res: Response,
) {
  try {
    const id = param(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid guarantor ID",
      });
      return;
    }

    const { isVerified } =
      verifyGuarantorSchema.parse(
        req.body,
      );

    const guarantor =
      await service.verifyGuarantor(
        id,
        isVerified,
      );

    res.json({
      success: true,
      message: "Guarantor verification updated",
      data: guarantor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to verify guarantor",
    });
  }
}

export async function deleteGuarantor(
  req: Request,
  res: Response,
) {
  try {
    const id = param(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid guarantor ID",
      });
      return;
    }

    await service.deleteGuarantor(id);

    res.json({
      success: true,
      message: "Guarantor deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete guarantor",
    });
  }
}