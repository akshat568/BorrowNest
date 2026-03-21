const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    pricePerHour: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      enum: ["Electronics", "Kitchen", "Home", "Transport", "Others"],
      default: "Others",
    },

    image: {
      type: String,
      required: false,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Item", itemSchema);
