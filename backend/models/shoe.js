import mongoose from "mongoose";

const shoeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["men", "women"],
    },
    category: {
      type: String,
      required: true,
      enum: ["running", "sports"],
    },
    stock: { type: Number, required: true, default: 0 },
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
