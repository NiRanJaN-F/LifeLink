
import express from "express";
import {
  createDonorProfile,
  searchDonors,
} from "../controllers/donorController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public/authenticated donor search route
router.get("/search", searchDonors);

// Protected donor profile creation route
router.post("/profile", authMiddleware, createDonorProfile);

export default router;
