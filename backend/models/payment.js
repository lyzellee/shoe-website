import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "GCash", "Card"],
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);
paymentSchema.index({ orderId: 1, paymentStatus: 1 });
export default mongoose.model("Payment", paymentSchema);
