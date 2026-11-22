import express from "express";
import {
  createBloodRequest,
  getBloodRequests,
  getUserBloodRequests,
  respondToBloodRequest,
  updateRequestStatus,
  getRequestDonorResponses,
} from "../controllers/requestController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All blood request routes require authentication
router.use(authMiddleware);

// Create a new blood request
router.post("/", createBloodRequest);

// List active blood requests (with urgency, blood group, and city filters)
router.get("/", getBloodRequests);

// List requests created by the current user
router.get("/my-requests", getUserBloodRequests);

// Get donor response details for a specific blood request (owner only)
router.get("/:id/responses", getRequestDonorResponses);

// Donor accept/reject response
router.post("/:id/respond", respondToBloodRequest);

// Owner update request status (fulfilled/cancelled)
router.patch("/:id/status", updateRequestStatus);

export default router;
