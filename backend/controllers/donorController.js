
import db from "../config/database.js";

// CREATE DONOR PROFILE

export const createDonorProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      blood_group_id,
      age,
      city,
      state,
      last_donation_date,
      is_available,
    } = req.body;

    // Validate required fields

    if (!blood_group_id || !age || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    if (!Number.isInteger(Number(age)) || Number(age) < 18 || Number(age) > 65) {
      return res.status(400).json({
        success: false,
        message: "Donor age must be between 18 and 65.",
      });
    }

    // Check whether the logged-in user is a donor

    const [users] = await db.execute(
      "SELECT user_id, role, status FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0 || users[0].role !== "donor") {
      return res.status(403).json({
        success: false,
        message: "Only registered donor accounts can create donor profiles.",
      });
    }

    if (users[0].status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    // Validate blood group

    const [bloodGroups] = await db.execute(
      "SELECT blood_group_id FROM blood_groups WHERE blood_group_id = ?",
      [blood_group_id]
    );

    if (bloodGroups.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood group selected.",
      });
    }

    // Check for an existing donor profile

    const [existingDonor] = await db.execute(
      "SELECT donor_id FROM donors WHERE user_id = ?",
      [userId]
    );

    if (existingDonor.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Your donor profile already exists.",
      });
    }

    // Save donor profile

    const [result] = await db.execute(
      `INSERT INTO donors
      (user_id, blood_group_id, age, city, state,
       is_available, last_donation_date, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        Number(blood_group_id),
        Number(age),
        city.trim(),
        state.trim(),
        is_available === false || is_available === "false" ? 0 : 1,
        last_donation_date || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Donor profile created successfully!",
      donorId: result.insertId,
    });

  } catch (error) {
    console.error("Create donor profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create donor profile.",
    });
  }
};

// SEARCH DONORS
export const searchDonors = async (req, res) => {
  try {
    const { blood_group, city, state, is_available } = req.query;

    let query = `
      SELECT 
        d.donor_id,
        u.full_name,
        bg.group_name AS blood_group,
        d.blood_group_id,
        d.age,
        d.city,
        d.state,
        d.is_available,
        d.last_donation_date,
        d.verification_status
      FROM donors d
      JOIN users u ON d.user_id = u.user_id
      JOIN blood_groups bg ON d.blood_group_id = bg.blood_group_id
      WHERE u.status = 'active'
        AND d.verification_status = 'verified'
    `;

    const params = [];

    if (blood_group && blood_group.trim() !== "") {
      if (/^\d+$/.test(blood_group.trim())) {
        query += " AND d.blood_group_id = ?";
        params.push(Number(blood_group.trim()));
      } else {
        query += " AND bg.group_name = ?";
        params.push(blood_group.trim().toUpperCase());
      }
    }

    if (city && city.trim() !== "") {
      query += " AND d.city LIKE ?";
      params.push(`%${city.trim()}%`);
    }

    if (state && state.trim() !== "") {
      query += " AND d.state LIKE ?";
      params.push(`%${state.trim()}%`);
    }

    if (is_available !== undefined && is_available !== null && is_available !== "") {
      if (is_available === "true" || is_available === "1" || is_available === 1) {
        query += " AND d.is_available = 1";
      } else if (is_available === "false" || is_available === "0" || is_available === 0) {
        query += " AND d.is_available = 0";
      }
    }

    query += " ORDER BY d.is_available DESC, d.donor_id DESC";

    const [donors] = await db.execute(query, params);

    return res.status(200).json({
      success: true,
      count: donors.length,
      donors,
    });
  } catch (error) {
    console.error("Search donors error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while searching donors.",
    });
  }
};
