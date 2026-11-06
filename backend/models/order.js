import mongoose from "mongoose";
const orderSchema = new mongoose.Schema({
  orderReference: {
    type: String,
    required: true,
    unique: true,
  },

  items: [
    {
      shoeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shoe",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      size: {
        type: String,
      },

      color: {
        type: String,
      },

      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],

  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },

  orderDate: {
    type: Date,
    default: Date.now,
  },
});
export default mongoose.model("Order", orderSchema);
