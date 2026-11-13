import mongoose from "mongoose";
const orderSchema = new mongoose.Schema({
  orderReference: {
    type: String,
    required: true,
    unique: true,
  },

  customerAccessTokenHash: {
    type: String,
    select: false,
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

  paymentMethod: {
    type: String,
    enum: ["COD", "GCash", "Card"],
  },

  shippingCost: {
    type: Number,
    min: 0,
    default: 0,
  },

  discountAmount: {
    type: Number,
    min: 0,
    default: 0,
  },

  courier: {
    type: String,
    trim: true,
    default: "",
  },

  trackingNumber: {
    type: String,
    trim: true,
    default: "",
  },

  estimatedDelivery: {
    type: Date,
    default: null,
  },

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },

  statusHistory: [
    {
      status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        required: true,
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      note: {
        type: String,
        default: "",
      },
    },
  ],
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },

  deliveredAt: { type: Date, default: null },

  returnStatus: {
    type: String,
    enum: ["requested", "approved", "rejected", "refunded"],
  },
  returnReason: { type: String, trim: true, maxlength: 500, default: "" },
  returnRequestedAt: { type: Date, default: null },
  returnResolvedAt: { type: Date, default: null },
  returnNote: { type: String, trim: true, default: "" },

  orderDate: {
    type: Date,
    default: Date.now,
  },
});
// Para sa dashboard stats (paidMatch + date range filters)
orderSchema.index({ orderStatus: 1, paymentStatus: 1, orderDate: -1 });

// Para sa recent orders sort at order status donut chart
orderSchema.index({ orderDate: -1 });
export default mongoose.model("Order", orderSchema);
