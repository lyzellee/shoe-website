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
      },

      price: {
        type: Number,
        required: true,
      },
    },
  ],

  totalPrice: {
    type: Number,
    required: true,
  },

  orderStatus: {
    type: String,
    enum: ["pending", "shipped", "delivered"],
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
