import type {
  Request,
  Response,
} from "express";

import {
  getMyNotifications,
  getUnreadNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notification.service.js";

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
 * GET MY NOTIFICATIONS
 */
export async function getMyNotificationsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const notifications =
      await getMyNotifications(
        req.user!.userId,
      );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications",
    });
  }
}

/*
 * GET UNREAD NOTIFICATIONS
 */
export async function getUnreadNotificationsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const notifications =
      await getUnreadNotifications(
        req.user!.userId,
      );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Unable to retrieve unread notifications",
    });
  }
}

/*
 * GET ONE NOTIFICATION
 */
export async function getNotificationController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
      return;
    }

    const notification =
      await getNotificationById(
        id,
        req.user!.userId,
      );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Unable to retrieve notification",
    });
  }
}

/*
 * MARK ONE AS READ
 */
export async function markNotificationAsReadController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
      return;
    }

    const notification =
      await markNotificationAsRead(
        id,
        req.user!.userId,
      );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NOTIFICATION_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
}

/*
 * MARK ALL AS READ
 */
export async function markAllNotificationsAsReadController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const result =
      await markAllNotificationsAsRead(
        req.user!.userId,
      );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
}

/*
 * DELETE NOTIFICATION
 */
export async function deleteNotificationController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
      return;
    }

    await deleteNotification(
      id,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch {
    res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }
}