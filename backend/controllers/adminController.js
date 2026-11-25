import db from "../config/database.js";

// GET PLATFORM STATISTICS FOR ADMIN DASHBOARD
export const getAdminStats = async (req, res) => {
  try {
    const [[usersCnt]] = await db.execute("SELECT COUNT(*) AS total_users FROM users");
    const [[donorsCnt]] = await db.execute("SELECT COUNT(*) AS total_donors FROM donors");
    const [[pendingCnt]] = await db.execute(
      "SELECT COUNT(*) AS pending_donors FROM donors WHERE verification_status = 'pending'"
    );
    const [[verifiedCnt]] = await db.execute(
      "SELECT COUNT(*) AS verified_donors FROM donors WHERE verification_status = 'verified'"
    );
    const [[rejectedCnt]] = await db.execute(
      "SELECT COUNT(*) AS rejected_donors FROM donors WHERE verification_status = 'rejected'"
    );
    const [[requestsCnt]] = await db.execute(
      "SELECT COUNT(*) AS total_requests FROM blood_requests"
    );
    const [[activeReqCnt]] = await db.execute(
      "SELECT COUNT(*) AS active_requests FROM blood_requests WHERE request_status IN ('pending', 'approved')"
    );

    return res.status(200).json({
      success: true,
      stats: {
        total_users: usersCnt.total_users,
        total_donors: donorsCnt.total_donors,
        pending_donors: pendingCnt.pending_donors,
        verified_donors: verifiedCnt.verified_donors,
        rejected_donors: rejectedCnt.rejected_donors,
        total_requests: requestsCnt.total_requests,
        active_requests: activeReqCnt.active_requests,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching platform statistics.",
    });
  }
};

// GET DONORS LIST (Filtered by verification status: pending, verified, rejected, all)
export const getDonorsList = async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    let query = `
      SELECT 
        d.donor_id,
        d.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.status AS account_status,
        bg.blood_group_id,
        bg.group_name AS blood_group,
        d.age,
        d.city,
        d.state,
        d.is_available,
        d.last_donation_date,
        d.verification_status
      FROM donors d
      JOIN users u ON d.user_id = u.user_id
      JOIN blood_groups bg ON d.blood_group_id = bg.blood_group_id
    `;

    const params = [];

    if (status && status !== "all") {
      query += " WHERE d.verification_status = ?";
      params.push(status.toLowerCase());
    }

    query += " ORDER BY d.donor_id DESC";

    const [donors] = await db.execute(query, params);

    return res.status(200).json({
      success: true,
      count: donors.length,
      donors,
    });
  } catch (error) {
    console.error("Get admin donors list error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching donors list.",
    });
  }
};

// VERIFY OR REJECT A DONOR PROFILE
export const verifyDonor = async (req, res) => {
  const donorId = Number(req.params.id);
  const { status } = req.body;

  if (!donorId || isNaN(donorId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid donor ID.",
    });
  }

  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be either 'verified' or 'rejected'.",
    });
  }

  let connection;
  let inTransaction = false;

  try {
    connection = await db.getConnection();

    // Check donor existence
    const [donors] = await connection.execute(
      `SELECT d.donor_id, d.user_id, d.verification_status, u.full_name
       FROM donors d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.donor_id = ?`,
      [donorId]
    );

    if (donors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found.",
      });
    }

    const donor = donors[0];

    // Transaction for status update and notification
    await connection.beginTransaction();
    inTransaction = true;

    await connection.execute(
      "UPDATE donors SET verification_status = ? WHERE donor_id = ?",
      [status, donorId]
    );

    const notificationMsg =
      status === "verified"
        ? `Congratulations ${donor.full_name}! Your LifeLink blood donor profile has been verified by the administrator. You are now discoverable in donor searches.`
        : `Hello ${donor.full_name}, your blood donor profile verification was reviewed and not approved at this time. Please update your details in My Profile.`;

    await connection.execute(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [donor.user_id, notificationMsg]
    );

    await connection.commit();
    inTransaction = false;

    return res.status(200).json({
      success: true,
      message: `Donor profile has been marked as ${status}.`,
      verification_status: status,
    });
  } catch (error) {
    if (connection && inTransaction) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error("Rollback error:", rbErr);
      }
    }
    console.error("Verify donor error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating donor verification status.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

