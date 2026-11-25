import db from "../config/database.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

/**
 * LifeLink: Secure Administrator Account Creation Script
 *
 * Usage:
 *   node scripts/createAdmin.js <email> <password> [fullName] [phone]
 * Or via environment variables:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPassword123! node scripts/createAdmin.js
 */
async function createAdmin() {
  const args = process.argv.slice(2);

  const email = (args[0] || process.env.ADMIN_EMAIL || "").trim();
  const password = args[1] || process.env.ADMIN_PASSWORD || "";
  const fullName = (args[2] || process.env.ADMIN_NAME || "System Administrator").trim();
  const phone = (args[3] || process.env.ADMIN_PHONE || "9999999999").trim();

  console.log("=========================================");
  console.log(" LIFELINK: ADMIN ACCOUNT CREATION");
  console.log("=========================================");

  if (!email || !password) {
    console.error("Error: Administrator email and password are required.");
    console.error("\nUsage:");
    console.error("  node scripts/createAdmin.js <email> <password> [fullName] [phone]");
    console.error("\nExample:");
    console.error('  node scripts/createAdmin.js "admin@lifelink.org" "SecurePassword#2026" "LifeLink Admin" "9876543210"');
    console.error("\nAlternatively, set environment variables ADMIN_EMAIL and ADMIN_PASSWORD.");
    await db.end();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Admin password must be at least 8 characters long.");
    await db.end();
    process.exit(1);
  }

  try {
    const [existing] = await db.execute(
      "SELECT user_id, email, role FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log(`Notice: User with email '${email}' already exists (current role: '${existing[0].role}').`);
      console.log("Existing accounts are not modified. To promote an existing user, update their role directly in the database.");
      await db.end();
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'admin', 'active')`,
      [fullName, email, phone, passwordHash]
    );

    console.log(`Success: Admin account created successfully!`);
    console.log(`User ID: ${result.insertId}`);
    console.log(`Email:   ${email}`);
    console.log(`Role:    admin`);
    console.log(`Status:  active`);

    await db.end();
    process.exit(0);
  } catch (err) {
    console.error("Admin creation failed:", err.message);
    await db.end();
    process.exit(1);
  }
}

createAdmin();
