import db from "../config/database.js";

// CREATE BLOOD REQUEST
export const createBloodRequest = async (req, res) => {
  const userId = req.user.userId;
  const {
    blood_group_id,
    patient_name,
    hospital_name,
    city,
    units_required,
    urgency,
    required_date,
    contact_phone,
  } = req.body;

  // 1. Validation (validate inputs before acquiring connection)
  if (
    !blood_group_id ||
    !patient_name ||
    !hospital_name ||
    !city ||
    !units_required ||
    !required_date ||
    !contact_phone
  ) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all required fields.",
    });
  }

  if (patient_name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Patient name must be at least 2 characters.",
    });
  }

  if (hospital_name.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "Hospital name must be at least 3 characters.",
    });
  }

  if (city.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "City must be at least 2 characters.",
    });
  }

  const units = Number(units_required);
  if (!Number.isInteger(units) || units < 1 || units > 20) {
    return res.status(400).json({
      success: false,
      message: "Units required must be an integer between 1 and 20.",
    });
  }

  const validUrgencies = ["normal", "urgent", "emergency"];
  const chosenUrgency = urgency ? urgency.toLowerCase() : "normal";
  if (!validUrgencies.includes(chosenUrgency)) {
    return res.status(400).json({
      success: false,
      message: "Urgency must be normal, urgent, or emergency.",
    });
  }

  if (!/^[0-9]{10,15}$/.test(contact_phone.trim())) {
    return res.status(400).json({
      success: false,
      message: "Contact phone must be between 10 and 15 digits.",
    });
  }

  // Validate required_date is a valid date
  const reqDate = new Date(required_date);
  if (isNaN(reqDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid required date.",
    });
  }

  let connection;
  let inTransaction = false;
  try {
    connection = await db.getConnection();

    // Validate blood group ID
    const [bg] = await connection.execute(
      "SELECT blood_group_id, group_name FROM blood_groups WHERE blood_group_id = ?",
      [Number(blood_group_id)]
    );
    if (bg.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood group selected.",
      });
    }

    // 2. Database Transaction
    await connection.beginTransaction();
    inTransaction = true;

    const [insertResult] = await connection.execute(
      `INSERT INTO blood_requests 
        (user_id, blood_group_id, patient_name, hospital_name, city, units_required, urgency, required_date, contact_phone, request_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        Number(blood_group_id),
        patient_name.trim(),
        hospital_name.trim(),
        city.trim(),
        units,
        chosenUrgency,
        required_date,
        contact_phone.trim(),
      ]
    );

    const requestId = insertResult.insertId;

    // Insert confirmation notification for creator
    await connection.execute(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [
        userId,
        `Your blood request for ${patient_name.trim()} (${units} ${units === 1 ? "unit" : "units"} of ${bg[0].group_name}) has been posted successfully.`,
      ]
    );

    await connection.commit();
    inTransaction = false;

    return res.status(201).json({
      success: true,
      message: "Blood request created successfully!",
      requestId,
    });
  } catch (error) {
    if (connection && inTransaction) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error("Rollback error:", rbErr);
      }
    }
    console.error("Create blood request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating blood request.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};



// GET/LIST BLOOD REQUESTS (Community Feed)
export const getBloodRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { urgency, blood_group, city, status } = req.query;

    // Check if the current user has a donor profile
    let donorId = null;
    const [donors] = await db.execute(
      "SELECT donor_id, is_available, verification_status FROM donors WHERE user_id = ?",
      [userId]
    );
    if (donors.length > 0) {
      donorId = donors[0].donor_id;
    }

    // Build parameterized query.
    // NOTE: NEVER expose contact_phone or requester email/password in public response.
    let query = `
      SELECT 
        br.request_id,
        br.user_id AS requester_id,
        br.patient_name,
        br.hospital_name,
        br.city,
        br.units_required,
        br.urgency,
        br.required_date,
        br.request_status,
        br.created_at,
        bg.blood_group_id,
        bg.group_name AS blood_group,
        u.full_name AS requester_name,
        (br.user_id = ?) AS is_my_request,
        (
          SELECT COUNT(*) 
          FROM request_responses rr_acc 
          WHERE rr_acc.request_id = br.request_id AND rr_acc.response_status = 'accepted'
        ) AS accepted_count
    `;

    const params = [userId];

    if (donorId) {
      query += `,
        (
          SELECT rr_my.response_status 
          FROM request_responses rr_my 
          WHERE rr_my.request_id = br.request_id AND rr_my.donor_id = ?
        ) AS my_response_status
      `;
      params.push(donorId);
    } else {
      query += `, NULL AS my_response_status `;
    }

    query += `
      FROM blood_requests br
      JOIN blood_groups bg ON br.blood_group_id = bg.blood_group_id
      JOIN users u ON br.user_id = u.user_id
      WHERE 1=1
    `;

    // Status filter - by default, only active requests (pending / approved)
    if (status && status.trim() !== "") {
      query += " AND br.request_status = ?";
      params.push(status.trim().toLowerCase());
    } else {
      query += " AND br.request_status IN ('pending', 'approved')";
    }

    // Urgency filter
    if (urgency && urgency.trim() !== "" && urgency !== "all") {
      query += " AND br.urgency = ?";
      params.push(urgency.trim().toLowerCase());
    }

    // Blood group filter (by name or ID)
    if (blood_group && blood_group.trim() !== "" && blood_group !== "all") {
      if (/^\d+$/.test(blood_group.trim())) {
        query += " AND br.blood_group_id = ?";
        params.push(Number(blood_group.trim()));
      } else {
        query += " AND bg.group_name = ?";
        params.push(blood_group.trim().toUpperCase());
      }
    }

    // City filter
    if (city && city.trim() !== "") {
      query += " AND br.city LIKE ?";
      params.push(`%${city.trim()}%`);
    }

    // Sort: emergency first, then urgent, then normal; newest first
    query += `
      ORDER BY 
        CASE br.urgency
          WHEN 'emergency' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END ASC,
        br.created_at DESC
    `;

    const [requests] = await db.execute(query, params);

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
      isDonor: Boolean(donorId),
      donorDetails: donors.length > 0 ? {
        donor_id: donors[0].donor_id,
        is_available: Boolean(donors[0].is_available),
        verification_status: donors[0].verification_status,
      } : null,
    });
  } catch (error) {
    console.error("Get blood requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching blood requests.",
    });
  }
};


// GET USER'S OWN POSTED REQUESTS (My Requests)
export const getUserBloodRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    // In My Requests, the owner CAN view contact_phone since it belongs to them
    const query = `
      SELECT 
        br.request_id,
        br.user_id,
        br.patient_name,
        br.hospital_name,
        br.city,
        br.units_required,
        br.urgency,
        br.required_date,
        br.contact_phone,
        br.request_status,
        br.created_at,
        bg.blood_group_id,
        bg.group_name AS blood_group,
        (
          SELECT COUNT(*) 
          FROM request_responses rr 
          WHERE rr.request_id = br.request_id AND rr.response_status = 'accepted'
        ) AS accepted_count,
        (
          SELECT COUNT(*) 
          FROM request_responses rr 
          WHERE rr.request_id = br.request_id AND rr.response_status = 'rejected'
        ) AS rejected_count
      FROM blood_requests br
      JOIN blood_groups bg ON br.blood_group_id = bg.blood_group_id
      WHERE br.user_id = ?
      ORDER BY br.created_at DESC
    `;

    const [myRequests] = await db.execute(query, [userId]);

    return res.status(200).json({
      success: true,
      count: myRequests.length,
      requests: myRequests,
    });
  } catch (error) {
    console.error("Get user blood requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching your blood requests.",
    });
  }
};


// DONOR ACCEPT / REJECT RESPONSE
export const respondToBloodRequest = async (req, res) => {
  const userId = req.user.userId;
  const requestId = Number(req.params.id);
  const { response_status } = req.body;

  if (!requestId || isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid blood request ID.",
    });
  }

  if (!["accepted", "rejected"].includes(response_status)) {
    return res.status(400).json({
      success: false,
      message: "Response status must be 'accepted' or 'rejected'.",
    });
  }

  let connection;
  let inTransaction = false;
  try {
    connection = await db.getConnection();

    // 1. Check user account status and role
    const [users] = await connection.execute(
      "SELECT user_id, role, status FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0 || users[0].status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    if (users[0].role !== "donor") {
      return res.status(403).json({
        success: false,
        message: "Only registered donor accounts can respond to blood requests.",
      });
    }

    // 2. Check donor profile: must be active, verified, and available (Requirement 2)
    const [donors] = await connection.execute(
      "SELECT donor_id, is_available, verification_status FROM donors WHERE user_id = ?",
      [userId]
    );

    if (donors.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Please complete your donor profile before responding to blood requests.",
      });
    }

    const donor = donors[0];

    if (donor.verification_status !== "verified") {
      return res.status(403).json({
        success: false,
        message: "Only verified donors can accept or reject blood requests. Your profile is currently pending verification.",
      });
    }

    if (!donor.is_available) {
      return res.status(403).json({
        success: false,
        message: "Only currently available donors can respond to blood requests. Update your availability status in My Profile.",
      });
    }

    // 3. Check request exists and is active
    const [requests] = await connection.execute(
      "SELECT request_id, user_id, patient_name, request_status FROM blood_requests WHERE request_id = ?",
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blood request not found.",
      });
    }

    const bloodReq = requests[0];

    // Donors must not respond to their own requests (Requirement)
    if (bloodReq.user_id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot respond to your own blood request.",
      });
    }

    if (["fulfilled", "cancelled"].includes(bloodReq.request_status)) {
      return res.status(400).json({
        success: false,
        message: `This blood request is already ${bloodReq.request_status} and no longer accepting responses.`,
      });
    }

    // 4. Check existing response to ensure idempotency and prevent duplicate notifications
    const [existingResponse] = await connection.execute(
      "SELECT response_status FROM request_responses WHERE request_id = ? AND donor_id = ?",
      [requestId, donor.donor_id]
    );

    const isDuplicate =
      existingResponse.length > 0 &&
      existingResponse[0].response_status === response_status;

    if (isDuplicate) {
      return res.status(200).json({
        success: true,
        message:
          response_status === "accepted"
            ? "Thank you! Your willingness to help has already been recorded."
            : "Your response has already been recorded.",
        response_status,
      });
    }

    // 5. Database Transaction for safe response updates & notifications (Requirements 7, 8, 9)
    await connection.beginTransaction();
    inTransaction = true;

    await connection.execute(
      `INSERT INTO request_responses (request_id, donor_id, response_status, responded_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE response_status = VALUES(response_status), responded_at = NOW()`,
      [requestId, donor.donor_id, response_status]
    );

    // Notify the requester (using blood request owner's user_id)
    const notificationText =
      response_status === "accepted"
        ? `A verified donor accepted your blood request for ${bloodReq.patient_name}.`
        : `A donor was unable to fulfill your blood request for ${bloodReq.patient_name}.`;

    await connection.execute(
      `INSERT INTO notifications (user_id, message, is_read, created_at)
       VALUES (?, ?, 0, NOW())`,
      [bloodReq.user_id, notificationText]
    );

    // NOTE: Donor acceptance or rejection does NOT change request_status to approved or fulfilled.
    await connection.commit();
    inTransaction = false;

    return res.status(200).json({
      success: true,
      message:
        response_status === "accepted"
          ? "Thank you! Your willingness to help has been recorded."
          : "Your response has been recorded.",
      response_status,
    });
  } catch (error) {
    if (connection && inTransaction) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error("Rollback error:", rbErr);
      }
    }
    console.error("Respond to blood request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while recording your response.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


// UPDATE REQUEST STATUS (Owner Only: Fulfilled or Cancelled)
export const updateRequestStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = Number(req.params.id);
    const { request_status } = req.body;

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood request ID.",
      });
    }

    if (!["fulfilled", "cancelled"].includes(request_status)) {
      return res.status(400).json({
        success: false,
        message: "Status can only be updated to 'fulfilled' or 'cancelled'.",
      });
    }

    // Ownership check (Requirement 5)
    const [requests] = await db.execute(
      "SELECT request_id, user_id, request_status FROM blood_requests WHERE request_id = ?",
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blood request not found.",
      });
    }

    if (requests[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this blood request. Only the request owner can perform this action.",
      });
    }

    await db.execute(
      "UPDATE blood_requests SET request_status = ? WHERE request_id = ?",
      [request_status, requestId]
    );

    return res.status(200).json({
      success: true,
      message: `Blood request marked as ${request_status}.`,
      request_status,
    });
  } catch (error) {
    console.error("Update request status error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating request status.",
    });
  }
};


// GET DONOR RESPONSES FOR A SPECIFIC BLOOD REQUEST (Owner Only)
export const getRequestDonorResponses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = Number(req.params.id);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood request ID.",
      });
    }

    // 1. Verify blood request exists and requester is the owner
    const [requests] = await db.execute(
      `SELECT r.request_id, r.user_id, r.patient_name, r.hospital_name, r.city, 
              r.units_required, r.urgency, r.request_status, bg.group_name AS blood_group
       FROM blood_requests r
       JOIN blood_groups bg ON r.blood_group_id = bg.blood_group_id
       WHERE r.request_id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blood request not found.",
      });
    }

    const bloodReq = requests[0];

    // Strict ownership enforcement (Requirements 3 & 8)
    if (bloodReq.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the request creator can view donor response details.",
      });
    }

    // 2. Query individual donor responses
    // Requirements 5 & 6: Return phone number ONLY for donors whose response_status = 'accepted'.
    // For declined donors, phone is NULL. Never expose passwords, emails, or JWTs.
    const [responses] = await db.execute(
      `SELECT 
        rr.response_id,
        rr.request_id,
        rr.donor_id,
        rr.response_status,
        rr.responded_at,
        u.full_name AS donor_name,
        bg.group_name AS blood_group,
        d.age,
        d.city,
        d.state,
        d.is_available,
        d.last_donation_date,
        CASE 
          WHEN rr.response_status = 'accepted' THEN u.phone 
          ELSE NULL 
        END AS phone
       FROM request_responses rr
       JOIN donors d ON rr.donor_id = d.donor_id
       JOIN users u ON d.user_id = u.user_id
       JOIN blood_groups bg ON d.blood_group_id = bg.blood_group_id
       WHERE rr.request_id = ?
       ORDER BY 
         CASE WHEN rr.response_status = 'accepted' THEN 0 ELSE 1 END,
         rr.responded_at DESC`,
      [requestId]
    );

    const acceptedCount = responses.filter((r) => r.response_status === "accepted").length;
    const declinedCount = responses.filter((r) => r.response_status === "rejected").length;

    return res.status(200).json({
      success: true,
      request: {
        request_id: bloodReq.request_id,
        patient_name: bloodReq.patient_name,
        hospital_name: bloodReq.hospital_name,
        city: bloodReq.city,
        units_required: bloodReq.units_required,
        urgency: bloodReq.urgency,
        blood_group: bloodReq.blood_group,
        request_status: bloodReq.request_status,
      },
      responses,
      total_responses: responses.length,
      accepted_count: acceptedCount,
      declined_count: declinedCount,
    });
  } catch (error) {
    console.error("Get request donor responses error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching donor responses.",
    });
  }
};

