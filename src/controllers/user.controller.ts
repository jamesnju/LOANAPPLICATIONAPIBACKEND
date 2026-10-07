import type {
  Request,
  Response,
} from "express";

import {
  changePasswordSchema,
  createUserSchema,
  unlockAccountSchema,
  updateProfileSchema,
  updateUserRoleSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdSchema,
  userQuerySchema,
} from "../schemas/user.schema.js";

import * as userService from "../services/user.service.js";

function getParam(
  value: string | string[] | undefined,
): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

/*
 * GET /users
 */
export async function getUsers(
  req: Request,
  res: Response,
) {
  try {
    const query =
      userQuerySchema.parse(req.query);

    const result =
      await userService.getUsers(query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get users",
    });
  }
}

/*
 * GET /users/:id
 */
export async function getUserById(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    userIdSchema.parse({ id });

    const user =
      await userService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get user",
    });
  }
}

/*
 * POST /users
 */
export async function createUser(
  req: Request,
  res: Response,
) {
  try {
    const data =
      createUserSchema.parse(req.body);

    const user =
      await userService.createUser(data);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create user",
    });
  }
}

/*
 * PATCH /users/:id
 */
export async function updateUser(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const data =
      updateUserSchema.parse(req.body);

    const user =
      await userService.updateUser(
        id,
        data,
      );

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user",
    });
  }
}

/*
 * PATCH /users/:id/status
 */
export async function updateUserStatus(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const { status } =
      updateUserStatusSchema.parse(
        req.body,
      );

    const user =
      await userService.updateUserStatus(
        id,
        status,
      );

    res.json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user status",
    });
  }
}

/*
 * PATCH /users/:id/role
 */
export async function updateUserRole(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const { role } =
      updateUserRoleSchema.parse(
        req.body,
      );

    const user =
      await userService.updateUserRole(
        id,
        role,
      );

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user role",
    });
  }
}

/*
 * DELETE /users/:id
 */
export async function deleteUser(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    await userService.deleteUser(id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete user",
    });
  }
}

/*
 * GET /users/:id/applications
 */
export async function getUserApplications(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const applications =
      await userService.getUserApplications(
        id,
      );

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get applications",
    });
  }
}

/*
 * GET /users/:id/loans
 */
export async function getUserLoans(
  req: Request,
  res: Response,
) {
  try {
    const id =
      getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const loans =
      await userService.getUserLoans(
        id,
      );

    res.json({
      success: true,
      data: loans,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get loans",
    });
  }
}


/*
 * ============================================================
 * GET /users/me
 * ============================================================
 */
export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const profile = await userService.getMyProfile(userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get profile",
    });
  }
}

/*
 * ============================================================
 * PATCH /users/me
 * ============================================================
 */
export async function updateMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const data = updateProfileSchema.parse(req.body);
    const updated = await userService.updateMyProfile(userId, data);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update profile",
    });
  }
}

/*
 * ============================================================
 * POST /users/me/change-password
 * ============================================================
 */
export async function changeMyPassword(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    await userService.changeMyPassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to change password",
    });
  }
}

/*
 * ============================================================
 * POST /users/:id/unlock  (admin)
 * ============================================================
 */
export async function unlockAccount(req: Request, res: Response) {
  try {
    const adminUserId = req.user!.userId;
    const targetId = getParam(req.params.id);
    if (!targetId) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const { reason } = unlockAccountSchema.parse(req.body ?? {});
    const user = await userService.unlockAccount(adminUserId, targetId, reason);

    res.json({
      success: true,
      message: "Account unlocked successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to unlock account",
    });
  }
}