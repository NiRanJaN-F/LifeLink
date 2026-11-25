import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Determine optional SSL configuration for cloud databases (e.g., AWS RDS)
const getSslConfig = () => {
  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
    return {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    };
  }
  return undefined;
};

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lifelink_db",
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT ? Number(process.env.DB_CONNECTION_LIMIT) : 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: getSslConfig(),
};

const db = mysql.createPool(poolConfig);

export default db;
