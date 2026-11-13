import mongoose from "mongoose";

const orderSchemaInformation = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    province: {
      type: String,
      required: true,
    },

    zipCode: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

orderSchemaInformation.index({ orderId: 1 }, { unique: true });
export default mongoose.model("OrderSchemaInformation", orderSchemaInformation);
