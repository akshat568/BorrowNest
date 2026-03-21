const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending_payment", "booked", "cancelled", "completed"],
      default: "booked",
    },

    // Payment fields
    paymentStatus: {
      type: String,
      enum: ["pending", "paid_online", "pay_on_delivery"],
      default: "pending",
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
