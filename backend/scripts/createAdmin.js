import db from "../config/database.js";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || "admin@lifelink.org";
  const password = args[1] || "AdminPass123!";
  const fullName = args[2] || "System Administrator";
  const phone = args[3] || "9999999999";

  console.log("=========================================");
  console.log("LIFELINK: SECURE ADMIN ACCOUNT CREATION");
  console.log("=========================================");

  try {
    const [existing] = await db.execute(
      "SELECT user_id, email, role FROM users WHERE email = ?",
      [email.trim()]
    );

    if (existing.length > 0) {
      console.log(`User with email '${email}' already exists with role: '${existing[0].role}'.`);
      console.log("Existing users are never promoted automatically without explicit command.");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'admin', 'active')`,
      [fullName.trim(), email.trim(), phone.trim(), passwordHash]
    );

    console.log(`Admin account created successfully! User ID: ${result.insertId}`);
    console.log(`Email: ${email}`);
    console.log("Role: admin");
    console.log("Status: active");
    process.exit(0);
  } catch (err) {
    console.error("Admin creation failed:", err.message);
    process.exit(1);
  }
}

createAdmin();
