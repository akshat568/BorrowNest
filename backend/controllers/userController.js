const User = require("../models/User");

// ================= GET MY PROFILE =================
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ================= UPDATE MY PROFILE =================
exports.updateMe = async (req, res) => {
    try {
        const { name, location, avatar } = req.body;

        const updateFields = {};
        if (name !== undefined) updateFields.name = name.trim();
        if (location !== undefined) updateFields.location = location.trim();
        if (avatar !== undefined) updateFields.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.userId, updateFields, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
