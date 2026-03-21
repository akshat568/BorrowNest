const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    createOrder,
    verifyPayment,
    markPayOnDelivery,
} = require("../controllers/paymentController");

// Create Razorpay order
router.post("/create-order", protect, createOrder);

// Verify Razorpay payment
router.post("/verify", protect, verifyPayment);

// Mark booking as pay-on-delivery
router.post("/pay-on-delivery", protect, markPayOnDelivery);

module.exports = router;
