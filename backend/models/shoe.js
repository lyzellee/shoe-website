
import mongoose from "mongoose";

const shoeSchema = new mongoose.Schema(
  {
    // Basic product information
    name: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // Only Men and Women
    gender: {
      type: String,
      required: true,
      enum: ["men", "women"],
    },

    // Available product categories
    category: {
      type: String,
      required: true,
      enum: ["running", "sports", "casual", "lifestyle"],
    },

    // Product status
    productStatus: {
      type: String,
      enum: ["new", "popular"],
      default: null,
    },

    // Available shoe sizes
    sizes: {
      type: [Number],
      default: [],
    },

    // Shoe color
    color: {
      type: String,
      default: "",
    },

    // Uploaded product image path
    image: {
      type: String,
      default: "",
    },

    // Product description
    description: {
      type: String,
      default: "",
    },

    // Total stock quantity
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate shoe names (case-insensitive)
shoeSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

export default mongoose.model("Shoe", shoeSchema);

