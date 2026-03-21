const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    getMyChats,
    getChatMessages,
    sendMessage,
    getChatByBooking,
} = require("../controllers/chatController");

// Get all chats for logged-in user
router.get("/my", protect, getMyChats);

// Get chat by booking ID
router.get("/booking/:bookingId", protect, getChatByBooking);

// Get messages for a specific chat
router.get("/:chatId", protect, getChatMessages);

// Send a message in a chat
router.post("/:chatId/message", protect, sendMessage);

module.exports = router;
