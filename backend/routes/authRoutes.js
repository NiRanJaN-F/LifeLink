
import express from "express";

import {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Registration API
router.post("/register", registerUser);

// Login API
router.post("/login", loginUser);

// Profile APIs (Protected)
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);

export default router;
