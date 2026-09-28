import { Router } from "express";

import {
  getMyNotificationsController,
  getUnreadNotificationsController,
  getNotificationController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * GET /api/v1/notifications/me
 */
router.get(
  "/me",
  authenticate,
  getMyNotificationsController,
);

/*
 * GET /api/v1/notifications/unread
 */
router.get(
  "/unread",
  authenticate,
  getUnreadNotificationsController,
);

/*
 * PATCH /api/v1/notifications/read-all
 */
router.patch(
  "/read-all",
  authenticate,
  markAllNotificationsAsReadController,
);

/*
 * GET /api/v1/notifications/:id
 */
router.get(
  "/:id",
  authenticate,
  getNotificationController,
);

/*
 * PATCH /api/v1/notifications/:id/read
 */
router.patch(
  "/:id/read",
  authenticate,
  markNotificationAsReadController,
);

/*
 * DELETE /api/v1/notifications/:id
 */
router.delete(
  "/:id",
  authenticate,
  deleteNotificationController,
);

export default router;