import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Set environment for test mode before importing app
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_for_automated_testing_123456";
process.env.CLIENT_URL = "http://localhost:5173,https://test.lifelink.org";

const { default: app } = await import("../server.js");
const { default: db } = await import("../config/database.js");

describe("LifeLink Backend Automated Test Suite", () => {
  let server;
  let baseUrl;

  const validUserToken = jwt.sign(
    { userId: 999, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const validDonorToken = jwt.sign(
    { userId: 998, role: "donor" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Close db pool to prevent hanging processes
    try {
      await db.end();
    } catch (_) {}
  });

  // --------------------------------------------------------------------------
  // 1. Core Endpoints
  // --------------------------------------------------------------------------
  describe("Core & Health Check Endpoints", () => {
    it("GET / returns API welcome/status payload", async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, "LifeLink API");
      assert.equal(data.status, "running");
    });

    it("GET /api/health returns valid health check payload structure", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      // Should be 200 if DB is up, or 503 if DB is not connected
      assert.ok([200, 503].includes(res.status));
      const data = await res.json();
      assert.ok(["healthy", "unhealthy"].includes(data.status));
      assert.ok(data.database);
      assert.ok(["connected", "disconnected"].includes(data.database.status));
    });

    it("GET /unknown-route returns 404 with standard error message", async () => {
      const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Route not found/);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Authentication Validation
  // --------------------------------------------------------------------------
  describe("Authentication Input Validation", () => {
    it("POST /api/auth/register fails when required fields are missing", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "incomplete@example.com" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /All fields are required/i);
    });

    it("POST /api/auth/register rejects password shorter than 8 characters", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "Short Pass User",
          email: "shortpass@example.com",
          phone: "9876543210",
          password: "123",
          role: "user",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /at least 8 characters/i);
    });

    it("POST /api/auth/register rejects invalid account roles", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "Hacker User",
          email: "hacker@example.com",
          phone: "9876543210",
          password: "SecurePassword123!",
          role: "superadmin",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Invalid account role/i);
    });

    it("POST /api/auth/login fails when credentials are missing", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Email and password are required/i);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Protected Route Security & Token Verification
  // --------------------------------------------------------------------------
  describe("Protected Route Verification", () => {
    it("GET /api/auth/profile rejects requests without Authorization header", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Authentication token is required/i);
    });

    it("GET /api/auth/profile rejects requests with invalid / tampered token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        headers: { Authorization: "Bearer invalid.token.signature" },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Invalid or expired authentication token/i);
    });

    it("GET /api/notifications rejects unauthenticated requests", async () => {
      const res = await fetch(`${baseUrl}/api/notifications`);
      assert.equal(res.status, 401);
    });

    it("GET /api/admin/stats rejects non-admin users with 403", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${validUserToken}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Administrator privileges required/i);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Blood Request Input Validation
  // --------------------------------------------------------------------------
  describe("Blood Request Input Validation", () => {
    it("POST /api/requests fails when required fields are missing", async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validUserToken}`,
        },
        body: JSON.stringify({
          patient_name: "Jane Doe",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Please fill in all required fields/i);
    });

    it("POST /api/requests rejects invalid units (> 20 or < 1)", async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validUserToken}`,
        },
        body: JSON.stringify({
          blood_group_id: 1,
          patient_name: "John Patient",
          hospital_name: "City Hospital",
          city: "Metropolis",
          units_required: 50,
          urgency: "normal",
          required_date: "2026-12-01",
          contact_phone: "9876543210",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /between 1 and 20/i);
    });

    it("POST /api/requests rejects invalid urgency level", async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validUserToken}`,
        },
        body: JSON.stringify({
          blood_group_id: 1,
          patient_name: "John Patient",
          hospital_name: "City Hospital",
          city: "Metropolis",
          units_required: 2,
          urgency: "whenever",
          required_date: "2026-12-01",
          contact_phone: "9876543210",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /normal, urgent, or emergency/i);
    });

    it("POST /api/requests rejects invalid contact phone numbers", async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validUserToken}`,
        },
        body: JSON.stringify({
          blood_group_id: 1,
          patient_name: "John Patient",
          hospital_name: "City Hospital",
          city: "Metropolis",
          units_required: 2,
          urgency: "urgent",
          required_date: "2026-12-01",
          contact_phone: "invalid-phone",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /between 10 and 15 digits/i);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Donor Profile Input Validation
  // --------------------------------------------------------------------------
  describe("Donor Profile Input Validation", () => {
    it("POST /api/donors/profile fails when required fields are missing", async () => {
      const res = await fetch(`${baseUrl}/api/donors/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validDonorToken}`,
        },
        body: JSON.stringify({ age: 25 }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Please fill in all required fields/i);
    });

    it("POST /api/donors/profile rejects age outside 18-65 range", async () => {
      const res = await fetch(`${baseUrl}/api/donors/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validDonorToken}`,
        },
        body: JSON.stringify({
          blood_group_id: 1,
          age: 15,
          city: "Springfield",
          state: "Illinois",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /must be between 18 and 65/i);
    });
  });
});
