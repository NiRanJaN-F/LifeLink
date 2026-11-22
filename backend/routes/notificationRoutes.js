import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// All notification routes require authenticated user session
router.use(authMiddleware);

// GET /api/notifications - List user's notifications and unread count
router.get("/", getUserNotifications);

// PATCH /api/notifications/read-all - Mark all unread notifications as read
router.patch("/read-all", markAllNotificationsAsRead);

// PATCH /api/notifications/:id/read - Mark individual notification as read
router.patch("/:id/read", markNotificationAsRead);

export default router;
