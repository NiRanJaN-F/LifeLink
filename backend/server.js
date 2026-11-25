
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import db from "./config/database.js";

import authRoutes from "./routes/authRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();

app.use(helmet());

// CORS CONFIGURATION

const isProduction = process.env.NODE_ENV === "production";

const clientOrigins = isProduction
  ? [process.env.CLIENT_URL].filter(Boolean)
  : [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      // Allow only configured frontend origins
      if (clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// API RATE LIMITING

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// AUTHENTICATION ROUTES

app.use("/api/auth", authRoutes);

// DONOR ROUTES

app.use("/api/donors", donorRoutes);

// BLOOD REQUEST ROUTES

app.use("/api/requests", requestRoutes);

// ADMIN ROUTES

app.use("/api/admin", adminRoutes);

// NOTIFICATION ROUTES

app.use("/api/notifications", notificationRoutes);

// HOME ROUTE

app.get("/", (req, res) => {
  res.send("Welcome to LifeLink API!");
});

// DATABASE HEALTH CHECK

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "LifeLink API and MySQL connected!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// START SERVER

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`LifeLink server running on port ${PORT}`);
});
