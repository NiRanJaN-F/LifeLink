import db from "../config/database.js";

// GET USER NOTIFICATIONS
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Fetch recent notifications for authenticated user only
    const [notifications] = await db.execute(
      `SELECT notification_id, user_id, message, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    // 2. Calculate unread notification count
    const [unreadRows] = await db.execute(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    const unreadCount = Number(unreadRows[0]?.unread_count || 0);

    return res.status(200).json({
      success: true,
      notifications,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notifications.",
    });
  }
};

// MARK SINGLE NOTIFICATION AS READ
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = Number(req.params.id);

    if (!notificationId || isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    // Verify ownership: notification must belong to authenticated user
    const [existing] = await db.execute(
      "SELECT notification_id, is_read FROM notifications WHERE notification_id = ? AND user_id = ?",
      [notificationId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied.",
      });
    }

    // Update if currently unread
    if (existing[0].is_read === 0) {
      await db.execute(
        "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
        [notificationId, userId]
      );
    }

    // Return updated unread count
    const [unreadRows] = await db.execute(
      "SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification_id: notificationId,
      unread_count: Number(unreadRows[0]?.unread_count || 0),
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating notification.",
    });
  }
};

// MARK ALL NOTIFICATIONS AS READ
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      unread_count: 0,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating notifications.",
    });
  }
};
