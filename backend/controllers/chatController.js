const Chat = require("../models/Chat");

// ================= GET MY CHATS =================
exports.getMyChats = async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.userId })
            .populate("participants", "name email avatar")
            .populate("booking", "item startTime endTime status")
            .sort({ updatedAt: -1 });

        // For each chat, include the last message and the other participant's info
        const formatted = chats.map((chat) => {
            const otherParticipant = chat.participants.find(
                (p) => p._id.toString() !== req.userId
            );
            const lastMessage =
                chat.messages.length > 0
                    ? chat.messages[chat.messages.length - 1]
                    : null;

            return {
                _id: chat._id,
                otherUser: otherParticipant,
                booking: chat.booking,
                lastMessage: lastMessage
                    ? { text: lastMessage.text, createdAt: lastMessage.createdAt }
                    : null,
                updatedAt: chat.updatedAt,
            };
        });

        res.status(200).json({ chats: formatted });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET CHAT MESSAGES =================
exports.getChatMessages = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate("participants", "name email avatar")
            .populate({
                path: "booking",
                populate: { path: "item", select: "name image" },
            });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Verify user is a participant
        const isParticipant = chat.participants.some(
            (p) => p._id.toString() === req.userId
        );
        if (!isParticipant) {
            return res.status(403).json({ message: "Not authorized" });
        }

        res.status(200).json({
            chat: {
                _id: chat._id,
                participants: chat.participants,
                booking: chat.booking,
                messages: chat.messages,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= SEND MESSAGE =================
exports.sendMessage = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Message text is required" });
        }

        const chat = await Chat.findById(req.params.chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Verify user is a participant
        const isParticipant = chat.participants.some(
            (p) => p.toString() === req.userId
        );
        if (!isParticipant) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Push new message
        chat.messages.push({
            sender: req.userId,
            text: text.trim(),
        });

        await chat.save();

        const newMessage = chat.messages[chat.messages.length - 1];

        res.status(201).json({
            message: "Message sent",
            chatMessage: newMessage,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= GET CHAT BY BOOKING ID =================
exports.getChatByBooking = async (req, res) => {
    try {
        const chat = await Chat.findOne({
            booking: req.params.bookingId,
            participants: req.userId,
        });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found for this booking" });
        }

        res.status(200).json({ chatId: chat._id });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
