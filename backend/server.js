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

// Trust reverse proxy (AWS CloudFront / ALB / Nginx on EC2)
app.set("trust proxy", 1);

// SECURITY HEADERS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS CONFIGURATION
const isProduction = process.env.NODE_ENV === "production";

const parseOrigins = (originString) => {
  if (!originString) return [];
  return originString
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const configuredClientOrigins = parseOrigins(process.env.CLIENT_URL);

const defaultDevOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allowedOrigins = isProduction
  ? configuredClientOrigins
  : Array.from(new Set([...configuredClientOrigins, ...defaultDevOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// API RATE LIMITING
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests from this IP, please try again after 15 minutes.",
    },
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
  res.json({
    name: "LifeLink API",
    status: "running",
    version: "1.0.0",
  });
});

// DATABASE HEALTH CHECK
app.get("/api/health", async (req, res) => {
  const startTime = Date.now();
  try {
    await db.query("SELECT 1");
    const responseTimeMs = Date.now() - startTime;

    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: "connected",
        responseTimeMs,
      },
    });
  } catch (error) {
    console.error("Database health check error:", error.message);
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        status: "disconnected",
      },
      message: "Database service unavailable",
    });
  }
});

// 404 HANDLER FOR UNMATCHED ROUTES
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// CENTRALIZED ERROR HANDLER
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS request rejected: Origin not permitted.",
    });
  }

  // Safe server-side logging without passwords or tokens
  console.error("Unhandled Error:", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });

  return res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred."
        : err.message || "Internal server error",
  });
});

// START SERVER & GRACEFUL SHUTDOWN
const PORT = process.env.PORT || 5000;
let server;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`LifeLink server running on port ${PORT} [NODE_ENV=${process.env.NODE_ENV || "development"}]`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down LifeLink server...`);
    server.close(async () => {
      console.log("HTTP server closed.");
      try {
        await db.end();
        console.log("MySQL connection pool closed.");
      } catch (err) {
        console.error("Error closing MySQL pool:", err.message);
      }
      process.exit(0);
    });

    // Force shutdown after 10s if connections linger
    setTimeout(() => {
      console.error("Graceful shutdown timeout exceeded. Forcing termination.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});

export default app;
