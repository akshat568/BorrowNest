const Item = require("../models/Item");
const Booking = require("../models/Booking");

// ADD NEW ITEM
exports.addItem = async (req, res) => {
  try {
    const { name, description, pricePerHour, category } = req.body;

    // 1. Basic validation
    if (!name || !pricePerHour) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // 2. Create item
    const item = await Item.create({
      name,
      description,
      pricePerHour,
      category: category || "Others",
      image: imageUrl,
      owner: req.userId, // comes from JWT middleware
    });

    res.status(201).json({
      message: "Item added successfully",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= GET ALL ITEMS =================
exports.getAllItems = async (req, res) => {
  try {
    const filter = { isAvailable: true };

    // Category filter from query param
    if (req.query.category && req.query.category !== "all") {
      filter.category = new RegExp(`^${req.query.category}$`, "i");
    }

    const items = await Item.find(filter).populate("owner", "name email");

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= GET ITEMS WITH AVAILABILITY =================
exports.getItemsWithAvailability = async (req, res) => {
  try {
    const filter = { isAvailable: true };

    if (req.query.category && req.query.category !== "all") {
      filter.category = new RegExp(`^${req.query.category}$`, "i");
    }

    const items = await Item.find(filter).populate("owner", "name email");

    // For each item, compute availability based on future bookings
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemsWithAvailability = await Promise.all(
      items.map(async (item) => {
        const futureBookings = await Booking.find({
          item: item._id,
          status: "booked",
          endTime: { $gt: now },
        });

        let availability = "available";

        if (futureBookings.length > 0) {
          // Check if fully booked for next 7 days
          // Calculate total booked hours in next 7 days
          let totalBookedHours = 0;
          for (const booking of futureBookings) {
            const start = new Date(
              Math.max(booking.startTime.getTime(), now.getTime())
            );
            const end = new Date(
              Math.min(booking.endTime.getTime(), sevenDaysLater.getTime())
            );
            if (end > start) {
              totalBookedHours += (end - start) / (1000 * 60 * 60);
            }
          }

          // 7 days × ~13 available hours/day (8am-9pm)
          const totalAvailableHours = 7 * 13;
          const bookedRatio = totalBookedHours / totalAvailableHours;

          if (bookedRatio >= 0.8) {
            availability = "unavailable";
          } else if (totalBookedHours > 0) {
            availability = "partial";
          }
        }

        return {
          ...item.toObject(),
          availability,
        };
      })
    );

    res.status(200).json({
      count: itemsWithAvailability.length,
      items: itemsWithAvailability,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= GET MY ITEMS =================
exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ owner: req.userId });

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= SOFT DELETE ITEM =================
exports.softDeleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;

    const item = await Item.findOne({
      _id: itemId,
      owner: req.userId, // ensures only owner can delete
    });

    if (!item) {
      return res.status(404).json({
        message: "Item not found or not authorized",
      });
    }

    item.isAvailable = false;
    await item.save();

    res.status(200).json({
      message: "Item removed successfully (soft delete)",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ================= RESTORE ITEM =================
exports.restoreItem = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!item) {
      return res.status(404).json({
        message: "Item not found or not authorized",
      });
    }

    item.isAvailable = true;
    await item.save();

    res.status(200).json({
      message: "Item restored successfully",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
