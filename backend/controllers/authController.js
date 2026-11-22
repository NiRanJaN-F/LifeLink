
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// REGISTER USER

export const registerUser = async (req, res) => {
    try {
        const { full_name, email, phone, password, role } = req.body;

        if (!full_name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!["user", "donor"].includes(role || "user")) {
            return res.status(400).json({
                success: false,
                message: "Invalid account role"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        const [existingUser] = await db.execute(
            "SELECT user_id FROM users WHERE email = ?",
            [email.trim()]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            `INSERT INTO users
            (full_name, email, phone, password_hash, role)
            VALUES (?, ?, ?, ?, ?)`,
            [
                full_name.trim(),
                email.trim(),
                phone.trim(),
                password_hash,
                role || "user"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


// LOGIN USER

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [users] = await db.execute(
            `SELECT user_id, full_name, email, phone,
                    password_hash, role, status
             FROM users
             WHERE email = ?`,
            [email.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked or inactive"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            {
                userId: user.user_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};


// GET USER PROFILE

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [users] = await db.execute(
            `SELECT user_id, full_name, email, phone, role, status
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const user = users[0];

        // If donor, fetch associated donor profile details if present
        let donorProfile = null;
        if (user.role === "donor") {
            try {
                const [donors] = await db.execute(
                    `SELECT d.donor_id, d.blood_group_id, bg.group_name AS blood_group,
                            d.age, d.city, d.state, d.is_available, d.last_donation_date,
                            d.verification_status
                     FROM donors d
                     LEFT JOIN blood_groups bg ON d.blood_group_id = bg.blood_group_id
                     WHERE d.user_id = ?`,
                    [userId]
                );
                if (donors.length > 0) {
                    donorProfile = donors[0];
                }
            } catch (donorErr) {
                console.error("Error fetching donor profile info:", donorErr);
            }
        }

        return res.status(200).json({
            success: true,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                donor: donorProfile,
            },
        });
    } catch (error) {
        console.error("Get user profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching profile",
        });
    }
};


// UPDATE USER PROFILE

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { full_name, phone } = req.body;

        if (!full_name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Full name and phone number are required.",
            });
        }

        if (full_name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Full name must be at least 2 characters.",
            });
        }

        if (!/^[0-9]{10,15}$/.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be between 10 and 15 digits.",
            });
        }

        await db.execute(
            `UPDATE users
             SET full_name = ?, phone = ?
             WHERE user_id = ?`,
            [full_name.trim(), phone.trim(), userId]
        );

        const [users] = await db.execute(
            `SELECT user_id, full_name, email, phone, role, status
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        // Fetch donor details if applicable
        let donorProfile = null;
        if (users[0].role === "donor") {
            try {
                const [donors] = await db.execute(
                    `SELECT d.donor_id, d.blood_group_id, bg.group_name AS blood_group,
                            d.age, d.city, d.state, d.is_available, d.last_donation_date,
                            d.verification_status
                     FROM donors d
                     LEFT JOIN blood_groups bg ON d.blood_group_id = bg.blood_group_id
                     WHERE d.user_id = ?`,
                    [userId]
                );
                if (donors.length > 0) {
                    donorProfile = donors[0];
                }
            } catch (donorErr) {
                console.error("Error fetching donor profile info:", donorErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            user: {
                ...users[0],
                donor: donorProfile,
            },
        });
    } catch (error) {
        console.error("Update user profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating profile",
        });
    }
};
