const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../models/Booking");

// ── Helper: check if Razorpay keys are configured ──
function razorpayConfigured() {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    return (
        keyId &&
        keySecret &&
        keyId !== "rzp_test_placeholder" &&
        keySecret !== "placeholder_secret"
    );
}

// Lazily initialize Razorpay only when keys are real
let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayConfigured()) return null;
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
}

// ================= CREATE RAZORPAY ORDER =================
exports.createOrder = async (req, res) => {
    try {
        const razorpay = getRazorpay();
        if (!razorpay) {
            return res.status(503).json({
                message:
                    "Online payments are not configured yet. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file. You can get test-mode keys from https://dashboard.razorpay.com",
            });
        }

        const { bookingId, amount } = req.body;

        if (!bookingId || !amount) {
            return res
                .status(400)
                .json({ message: "Booking ID and amount are required" });
        }

        if (amount <= 0) {
            return res
                .status(400)
                .json({ message: "Amount must be greater than 0" });
        }

        // Verify the booking exists and belongs to this user
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.renter.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized" });
        }
        if (booking.paymentStatus === "paid_online") {
            return res.status(400).json({ message: "This booking is already paid" });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects paise
            currency: "INR",
            receipt: `booking_${bookingId}`,
            notes: {
                bookingId: bookingId,
                userId: req.userId,
            },
        };

        const order = await razorpay.orders.create(options);

        // Store order ID on booking
        booking.razorpayOrderId = order.id;
        await booking.save();

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error);
        res.status(500).json({
            message: "Failed to create payment order. Please try again.",
            error: error.message,
        });
    }
};

// ================= VERIFY RAZORPAY PAYMENT =================
exports.verifyPayment = async (req, res) => {
    try {
        if (!razorpayConfigured()) {
            return res.status(503).json({ message: "Payment system not configured" });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
            req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
            return res.status(400).json({ message: "Missing payment verification data" });
        }

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            // Payment signature mismatch — possible tampering
            const booking = await Booking.findById(bookingId);
            if (booking && booking.status === "pending_payment") {
                booking.status = "cancelled";
                booking.paymentStatus = "pending";
                await booking.save();
            }
            return res.status(400).json({
                message: "Payment verification failed. The booking has been cancelled for safety.",
            });
        }

        // Update booking with payment info — mark as confirmed
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        booking.status = "booked";
        booking.paymentStatus = "paid_online";
        booking.razorpayPaymentId = razorpay_payment_id;
        await booking.save();

        res.status(200).json({
            message: "Payment verified successfully! Your booking is confirmed.",
            booking,
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({
            message: "Payment verification failed. Please contact support.",
            error: error.message,
        });
    }
};

// ================= MARK PAY IN PERSON =================
exports.markPayOnDelivery = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.renter.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        booking.status = "booked";
        booking.paymentStatus = "pay_on_delivery";
        await booking.save();

        res.status(200).json({
            message: "Booking confirmed! Pay when you pick up the item.",
            booking,
        });
    } catch (error) {
        console.error("Pay on delivery error:", error);
        res.status(500).json({
            message: "Failed to confirm booking. Please try again.",
            error: error.message,
        });
    }
};
