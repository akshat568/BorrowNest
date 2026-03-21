const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMe, updateMe } = require("../controllers/userController");

// Get logged-in user's profile
router.get("/me", protect, getMe);

// Update logged-in user's profile
router.patch("/me", protect, updateMe);

module.exports = router;
