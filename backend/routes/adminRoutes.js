import express from "express";
import {
  getAdminStats,
  getDonorsList,
  verifyDonor,
} from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Enforce authentication AND administrator role on all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Get platform stats
router.get("/stats", getAdminStats);

// Get donors directory (filter by ?status=pending|verified|rejected|all)
router.get("/donors", getDonorsList);

// Verify or reject a donor
router.patch("/donors/:id/verify", verifyDonor);

export default router;
