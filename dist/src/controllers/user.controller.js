import { createUserSchema, updateUserRoleSchema, updateUserSchema, updateUserStatusSchema, userIdSchema, userQuerySchema, } from "../schemas/user.schema.js";
import * as userService from "../services/user.service.js";
function getParam(value) {
    if (!value)
        return null;
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
}
/*
 * GET /users
 */
export async function getUsers(req, res) {
    try {
        const query = userQuerySchema.parse(req.query);
        const result = await userService.getUsers(query);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get users",
        });
    }
}
/*
 * GET /users/:id
 */
export async function getUserById(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        userIdSchema.parse({ id });
        const user = await userService.getUserById(id);
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get user",
        });
    }
}
/*
 * POST /users
 */
export async function createUser(req, res) {
    try {
        const data = createUserSchema.parse(req.body);
        const user = await userService.createUser(data);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create user",
        });
    }
}
/*
 * PATCH /users/:id
 */
export async function updateUser(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const data = updateUserSchema.parse(req.body);
        const user = await userService.updateUser(id, data);
        res.json({
            success: true,
            message: "User updated successfully",
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update user",
        });
    }
}
/*
 * PATCH /users/:id/status
 */
export async function updateUserStatus(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const { status } = updateUserStatusSchema.parse(req.body);
        const user = await userService.updateUserStatus(id, status);
        res.json({
            success: true,
            message: "User status updated successfully",
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update user status",
        });
    }
}
/*
 * PATCH /users/:id/role
 */
export async function updateUserRole(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const { role } = updateUserRoleSchema.parse(req.body);
        const user = await userService.updateUserRole(id, role);
        res.json({
            success: true,
            message: "User role updated successfully",
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update user role",
        });
    }
}
/*
 * DELETE /users/:id
 */
export async function deleteUser(req, res) {
    try {
        const id = getParam(req.params.id);
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to delete user",
        });
    }
}
/*
 * GET /users/:id/applications
 */
export async function getUserApplications(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const applications = await userService.getUserApplications(id);
        res.json({
            success: true,
            data: applications,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get applications",
        });
    }
}
/*
 * GET /users/:id/loans
 */
export async function getUserLoans(req, res) {
    try {
        const id = getParam(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const loans = await userService.getUserLoans(id);
        res.json({
            success: true,
            data: loans,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to get loans",
        });
    }
}
//# sourceMappingURL=user.controller.js.map