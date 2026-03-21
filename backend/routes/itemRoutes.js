const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const {
  addItem,
  getAllItems,
  getMyItems,
  softDeleteItem,
  restoreItem,
  getItemsWithAvailability,
} = require("../controllers/itemController");
const protect = require("../middleware/authMiddleware");

router.post("/add", protect, upload.single("image"), addItem);
router.get("/", getAllItems);
router.get("/with-availability", getItemsWithAvailability);
router.get("/my", protect, getMyItems);
router.patch("/soft-delete/:id", protect, softDeleteItem);
router.patch("/restore/:id", protect, restoreItem);
router.get("/:id", async (req, res) => {
  try {
    const Item = require("../models/Item");
    const item = await Item.findById(req.params.id).populate("owner", "name");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
