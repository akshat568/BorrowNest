const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  createBooking,
  getMyBookings,
  getBookedSlotsForItem,
  cancelBooking,
  cancelPendingPayment,
  getOwnerBookings,
} = require("../controllers/bookingController");

// Create booking (renter)
router.post("/create", protect, createBooking);

// My bookings (renter view)
router.get("/my", protect, getMyBookings);

// Bookings on my items (owner view)
router.get("/owner", protect, getOwnerBookings);

// Cancel a booking (renter)
router.patch("/cancel/:id", protect, cancelBooking);

// Cancel a pending-payment booking (renter dismissed Razorpay)
router.patch("/cancel-pending/:id", protect, cancelPendingPayment);

// Get booked slots for an item (PUBLIC — needed for slot disabling)
router.get("/item/:itemId", getBookedSlotsForItem);

module.exports = router;
