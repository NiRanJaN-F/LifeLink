import db from "../config/database.js";

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required.",
      });
    }

    // Verify against live database record to ensure role and active status
    const [users] = await db.execute(
      "SELECT user_id, role, status FROM users WHERE user_id = ?",
      [req.user.userId]
    );

    if (users.length === 0 || users[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required.",
      });
    }

    if (users[0].status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your administrator account is inactive or blocked.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error verifying administrator authorization.",
    });
  }
};

export default adminMiddleware;
