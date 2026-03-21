const Booking = require("../models/Booking");
const Item = require("../models/Item");
const Chat = require("../models/Chat");

// ================= CREATE BOOKING =================
exports.createBooking = async (req, res) => {
  try {
    const { itemId, startTime, endTime, paymentMethod } = req.body;
    const renterId = req.userId;

    // 1. Basic validation
    if (!itemId || !startTime || !endTime) {
      return res.status(400).json({
        message: "Item, start time and end time are required",
      });
    }

    if (!paymentMethod || !["pay_online", "pay_in_person"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Please select a valid payment method (pay_online or pay_in_person)",
      });
    }

    // 2. Check item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    // 3. Owner cannot book own item
    if (item.owner.toString() === renterId) {
      return res.status(400).json({
        message: "You cannot book your own item",
      });
    }

    // 4. Check for overlapping bookings (exclude cancelled and pending_payment)
    const overlappingBooking = await Booking.findOne({
      item: itemId,
      status: { $in: ["booked", "pending_payment"] },
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) },
        },
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: "Item is already booked for the selected time slot",
      });
    }

    // 5. Set initial status based on payment method
    const initialStatus = paymentMethod === "pay_online" ? "pending_payment" : "booked";
    const initialPaymentStatus = paymentMethod === "pay_online" ? "pending" : "pay_on_delivery";

    // 6. Create booking
    const booking = await Booking.create({
      item: itemId,
      owner: item.owner,
      renter: renterId,
      startTime,
      endTime,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
    });

    // 7. Auto-create chat between owner and renter
    try {
      let existingChat = await Chat.findOne({
        participants: { $all: [item.owner, renterId] },
        booking: booking._id,
      });

      if (!existingChat) {
        await Chat.create({
          participants: [item.owner, renterId],
          booking: booking._id,
          messages: [
            {
              sender: renterId,
              text: `Hi! I've booked "${item.name}". Looking forward to it!`,
            },
          ],
        });
      }
    } catch (chatErr) {
      console.error("Chat auto-creation failed:", chatErr);
      // Don't fail the booking if chat creation fails
    }

    res.status(201).json({
      message:
        paymentMethod === "pay_online"
          ? "Booking created! Complete payment to confirm."
          : "Booking confirmed! Pay when you pick up the item.",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      message: "Failed to create booking. Please try again.",
      error: error.message,
    });
  }
};

// ================= CANCEL PENDING PAYMENT =================
// Called when user dismisses Razorpay modal or payment fails
exports.cancelPendingPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.renter.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (booking.status !== "pending_payment") {
      return res.status(400).json({
        message: "Only pending-payment bookings can be cancelled this way",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({
      message: "Pending booking cancelled",
      booking,
    });
  } catch (error) {
    console.error("Cancel pending payment error:", error);
    res.status(500).json({
      message: "Failed to cancel pending booking",
      error: error.message,
    });
  }
};

// ================= GET MY BOOKINGS =================
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ renter: req.userId })
      .populate("item", "name pricePerHour image")
      .populate("owner", "name email")
      .sort({ startTime: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= GET BOOKED SLOTS FOR ITEM =================
exports.getBookedSlotsForItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const bookings = await Booking.find({
      item: itemId,
      status: { $in: ["booked", "pending_payment"] },
    }).select("startTime endTime");

    res.status(200).json({
      itemId,
      bookedSlots: bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= CANCEL BOOKING =================
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only the renter who made the booking can cancel it
    if (booking.renter.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to cancel this booking" });
    }

    if (booking.status !== "booked" && booking.status !== "pending_payment") {
      return res.status(400).json({ message: "Only active bookings can be cancelled" });
    }

    // Only future bookings can be cancelled
    if (new Date(booking.startTime) <= new Date()) {
      return res.status(400).json({ message: "Cannot cancel a past booking" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= GET OWNER BOOKINGS =================
exports.getOwnerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ owner: req.userId })
      .populate("item", "name pricePerHour image")
      .populate("renter", "name email")
      .sort({ startTime: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
