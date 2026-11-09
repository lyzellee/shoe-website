import mongoose from "mongoose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import Shoe from "../models/shoe.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";
import OrderSchemaInformation from "../models/orderInformation.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { orderReference, items, paymentMethod } = req.body;

    // Validate order reference
    if (typeof orderReference !== "string" || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
      });
    }

    if (
      paymentMethod &&
      !["COD", "GCash", "Card"].includes(paymentMethod)
    ) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    // Validate order items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain at least one item",
      });
    }
    // Limit the number of different item entries per order
    if (items.length > 5) {
      return res.status(400).json({
        message: "An order cannot contain more than 5 item entries",
      });
    }
    // Start transaction
    session.startTransaction();

    // Check duplicate order reference
    const existingOrder = await Order.findOne({
      orderReference: orderReference.trim(),
    }).session(session);

    if (existingOrder) {
      await session.abortTransaction();

      return res.status(409).json({
        message: "Order reference already exists",
      });
    }

    let computedTotalPrice = 0;
    const customerAccessToken = randomBytes(32).toString("hex");
    const customerAccessTokenHash = createHash("sha256")
      .update(customerAccessToken)
      .digest("hex");

    // Validate each order item
    for (const item of items) {
      // Validate shoe ID
      if (!mongoose.Types.ObjectId.isValid(item.shoeId)) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Invalid shoe ID",
        });
      }

      // Validate quantity
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Quantity must be a positive whole number",
        });
      }

      // Find shoe
      const shoe = await Shoe.findById(item.shoeId).session(session);

      if (!shoe) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "Shoe not found",
        });
      }

      // Check available stock
      if (shoe.stock < item.quantity) {
        await session.abortTransaction();

        return res.status(400).json({
          message: `Insufficient stock for ${shoe.name}. Available: ${shoe.stock}`,
        });
      }

      // Deduct stock
      const updatedShoe = await Shoe.findOneAndUpdate(
        {
          _id: item.shoeId,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        {
          returnDocument: "after",
          session,
        },
      );

      if (!updatedShoe) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Insufficient stock",
        });
      }

      // Set shoe price
      item.price = shoe.price;

      // Compute total price
      computedTotalPrice += shoe.price * item.quantity;
    }

    // Create order
    const newOrder = await Order.create(
      [
        {
          orderReference: orderReference.trim(),
          items,
          totalPrice: computedTotalPrice,
          paymentMethod,
          customerAccessTokenHash,
          statusHistory: [{ status: "pending", changedAt: new Date() }],
        },
      ],
      { session },
    );

    // Commit transaction
    await session.commitTransaction();

    // Return success response
    const responseOrder = newOrder[0].toObject();
    delete responseOrder.customerAccessTokenHash;
    res.status(201).json({
      message: "Order created successfully!",
      data: responseOrder,
      customerAccessToken,
    });
  } catch (err) {
    // Abort transaction if an error occurs
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create order error:", err);

    // Handle duplicate order reference
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Order reference already exists",
      });
    }

    // Handle other errors
    res.status(500).json({
      message: "Error creating order",
    });
  } finally {
    // End session
    await session.endSession();
  }
};
export const getAllOrder = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "orderschemainformations",
          localField: "_id",
          foreignField: "orderId",
          as: "customerInfo",
        },
      },
      {
        $unwind: {
          path: "$customerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const populatedOrders = await Order.populate(orders, {
      path: "items.shoeId",
    });
    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ALL ORDER ERROR:", err);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;
    const allowedStatuses = ["pending", "processing", "shipped", "delivered"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const statusOrder = {
      pending: 0,
      processing: 1,
      shipped: 2,
      delivered: 3,
    };

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        message: "Cancelled orders cannot be moved to another status",
      });
    }

    if (statusOrder[orderStatus] < statusOrder[order.orderStatus]) {
      return res.status(400).json({
        message: "Order status cannot move backward",
      });
    }

    // Courier + tracking number are required before an order can be shipped
    const statusNote =
      typeof req.body.note === "string" ? req.body.note.trim() : "";
    const nextCourier =
      typeof req.body.courier === "string"
        ? req.body.courier.trim()
        : order.courier;
    const nextTracking =
      typeof req.body.trackingNumber === "string"
        ? req.body.trackingNumber.trim()
        : order.trackingNumber;

    if (orderStatus === "shipped" && (!nextCourier || !nextTracking)) {
      return res.status(400).json({
        message:
          "Courier and tracking number are required to mark an order as shipped",
      });
    }

    if (order.orderStatus !== orderStatus) {
      order.orderStatus = orderStatus;
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: orderStatus,
        changedAt: new Date(),
        note: statusNote,
      });

      if (orderStatus === "delivered") {
        order.deliveredAt = new Date();
        // Cash on delivery is paid when the order arrives
        if (
          order.paymentMethod === "COD" &&
          order.paymentStatus !== "completed"
        ) {
          order.paymentStatus = "completed";
        }
      }
    }

    const { courier, trackingNumber, estimatedDelivery } = req.body;
    if (typeof courier === "string") order.courier = courier.trim();
    if (typeof trackingNumber === "string") {
      order.trackingNumber = trackingNumber.trim();
    }
    if (estimatedDelivery !== undefined) {
      const parsedEstimate = new Date(estimatedDelivery);
      if (Number.isNaN(parsedEstimate.getTime())) {
        return res.status(400).json({ message: "Invalid estimated delivery date" });
      }
      order.estimatedDelivery = parsedEstimate;
    }
    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      data: order,
    });
  } catch (err) {
    console.error("UPDATE ORDER STATUS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const { references } = req.body;

    if (!Array.isArray(references) || references.length === 0) {
      return res.status(200).json([]);
    }

    const cleanReferences = references
      .filter((reference) => typeof reference === "string")
      .map((reference) => reference.trim())
      .filter(Boolean)
      .slice(0, 50);

    const orders = await Order.aggregate([
      {
        $match: {
          orderReference: { $in: cleanReferences },
        },
      },
      {
        $project: {
          customerAccessTokenHash: 0,
        },
      },
      {
        $lookup: {
          from: "orderschemainformations",
          localField: "_id",
          foreignField: "orderId",
          as: "customerInfo",
        },
      },
      {
        $unwind: {
          path: "$customerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const populatedOrders = await Order.populate(orders, {
      path: "items.shoeId",
    });

    const orderIds = populatedOrders.map((order) => order._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .select("orderId paymentMethod paymentStatus createdAt updatedAt")
      .lean();
    const paymentByOrderId = new Map(
      payments.map((payment) => [payment.orderId.toString(), payment]),
    );

    return res.status(200).json(
      populatedOrders.map((order) => ({
        ...order,
        paymentInfo: paymentByOrderId.get(order._id.toString()) || null,
      })),
    );
  } catch (err) {
    console.error("GET CUSTOMER ORDERS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelCustomerOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const reference = req.params.reference?.trim();
    const accessToken = req.body?.customerAccessToken;
    if (
      !reference ||
      typeof accessToken !== "string" ||
      !/^[a-f0-9]{64}$/i.test(accessToken)
    ) {
      return res.status(404).json({ message: "Order not found" });
    }

    session.startTransaction();
    const order = await Order.findOne({ orderReference: reference })
      .select("+customerAccessTokenHash")
      .session(session);

    const suppliedHash = createHash("sha256").update(accessToken).digest();
    const storedHash = order?.customerAccessTokenHash
      ? Buffer.from(order.customerAccessTokenHash, "hex")
      : Buffer.alloc(0);
    if (
      !order ||
      storedHash.length !== suppliedHash.length ||
      !timingSafeEqual(storedHash, suppliedHash)
    ) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.orderStatus !== "pending" || order.paymentStatus === "completed") {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Only unpaid pending orders can be cancelled",
      });
    }

    const pendingPayment = await Payment.findOne({
      orderId: order._id,
      paymentStatus: "pending",
    }).session(session);
    if (pendingPayment) {
      await session.abortTransaction();
      return res.status(409).json({
        message: "A payment is still pending. Verify its status before cancelling.",
      });
    }

    order.orderStatus = "cancelled";
    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({
      status: "cancelled",
      changedAt: new Date(),
      note: "Cancelled by customer",
    });
    await order.save({ session });

    for (const item of order.items) {
      const restoredShoe = await Shoe.findByIdAndUpdate(
        item.shoeId,
        { $inc: { stock: item.quantity } },
        { session },
      );
      if (!restoredShoe) {
        await session.abortTransaction();
        return res.status(409).json({
          message: "Cannot restore stock because a product was not found",
        });
      }
    }

    await session.commitTransaction();

    const updatedOrder = await Order.findById(order._id)
      .populate("items.shoeId")
      .lean();
    const customerInfo = await OrderSchemaInformation.findOne({
      orderId: order._id,
    }).lean();

    return res.status(200).json({
      message: "Order cancelled successfully",
      data: { ...updatedOrder, customerInfo },
    });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("CANCEL CUSTOMER ORDER ERROR:", err);
    return res.status(500).json({ message: "Unable to cancel the order" });
  } finally {
    await session.endSession();
  }
};

export const getSingleOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // STEP 1: Validate order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // STEP 2: Find order and its shoe details
    const order = await Order.findById(id).populate("items.shoeId");

    // STEP 3: Check if order exists
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // STEP 4: Return order
    return res.status(200).json({
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (err) {
    console.error("Get single order error:", err);

    return res.status(500).json({
      message: "Error retrieving order",
    });
  }
};

export const deleteOrderById = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    // STEP 1: Validate order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // STEP 2: Start transaction
    session.startTransaction();

    // STEP 3: Find order
    const order = await Order.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Order not found",
      });
    }
    // STEP 4.1: Prevent cancellation of paid orders
    if (order.paymentStatus === "completed") {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Paid orders cannot be cancelled",
      });
    }

    // STEP 4.2: Check for pending payment records
    const pendingPayment = await Payment.findOne({
      orderId: order._id,
      paymentStatus: "pending",
    }).session(session);

    if (pendingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        message:
          "This order has a pending payment. Check the PayMongo payment status before cancelling.",
      });
    }
    // STEP 4: Only pending orders can be deleted
    if (order.orderStatus !== "pending") {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Only pending orders can be deleted",
      });
    }
    const cancelledOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        orderStatus: "pending",
        paymentStatus: { $ne: "completed" },
      },
      {
        $set: { orderStatus: "cancelled" },
        $push: {
          statusHistory: {
            status: "cancelled",
            changedAt: new Date(),
            note: "Cancelled by representative",
          },
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!cancelledOrder) {
      await session.abortTransaction();

      return res.status(409).json({
        message: "Order status changed. Please check the order again.",
      });
    }

    // STEP 5: Restore stock for each order item
    for (const item of cancelledOrder.items) {
      const restoredShoe = await Shoe.findByIdAndUpdate(
        item.shoeId,
        {
          $inc: { stock: item.quantity },
        },
        {
          returnDocument: "after",
          session,
        },
      );

      if (!restoredShoe) {
        await session.abortTransaction();

        return res.status(409).json({
          message: "Cannot restore stock because a shoe was not found",
        });
      }
    }
    // STEP 7: Commit transaction
    await session.commitTransaction();

    return res.status(200).json({
      message: "Order deleted and stock restored successfully",
      data: {
        orderId: order._id,
        orderReference: order.orderReference,
      },
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Delete order error:", err);

    return res.status(500).json({
      message: "Error deleting order",
    });
  } finally {
    await session.endSession();
  }
};

export const updateOrderItemQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, shoeId, quantity } = req.body;

    // STEP 1: Validate order ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // STEP 2: Validate shoe ID
    if (!mongoose.Types.ObjectId.isValid(shoeId)) {
      return res.status(400).json({
        message: "Invalid shoe ID",
      });
    }

    // STEP 3: Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be a positive whole number",
      });
    }
    // Simulan ang transaction pagkatapos ng validations
    session.startTransaction();

    // STEP 4: Hanapin ang order sa database
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Order not found",
      });
    }
    // STEP 5: Hanapin ang shoe sa loob ng order
    const orderItem = order.items.find(
      (item) => item.shoeId.toString() === shoeId,
    );

    if (!orderItem) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Shoe not found in this order",
      });
    }
    // STEP 6: Only unpaid, pending orders can be updated
    if (
      order.orderStatus !== "pending" ||
      order.paymentStatus === "completed"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Only unpaid, pending orders can be updated",
      });
    }
    // STEP 6.1: Prevent quantity updates during pending payment
    const pendingPayment = await Payment.findOne({
      orderId: order._id,
      paymentStatus: "pending",
    }).session(session);

    if (pendingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        message: "Cannot update quantity while payment is pending",
      });
    }
    // STEP 7: Hanapin ang actual shoe sa database
    const shoe = await Shoe.findById(shoeId).session(session);

    if (!shoe) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Shoe not found",
      });
    }
    // STEP 8: Kunin ang dating quantity at difference
    const oldQuantity = orderItem.quantity;
    const difference = quantity - oldQuantity;
    // STEP 9: I-adjust ang stock

    if (difference > 0) {
      // Nadagdagan ang quantity, kaya kailangan ng dagdag na stock
      const updatedShoe = await Shoe.findOneAndUpdate(
        {
          _id: shoeId,
          stock: { $gte: difference },
        },
        {
          $inc: { stock: -difference },
        },
        {
          returnDocument: "after",
          session,
        },
      );

      // Kapag kulang ang stock, huwag ituloy ang update
      if (!updatedShoe) {
        await session.abortTransaction();

        return res.status(400).json({
          message: `Insufficient stock. Available: ${shoe.stock}`,
        });
      }
    } else if (difference < 0) {
      // Nabawasan ang quantity, kaya ibalik ang sobrang pairs
      await Shoe.findByIdAndUpdate(
        shoeId,
        {
          $inc: { stock: Math.abs(difference) },
        },
        { session },
      );
    }
    // STEP 10: I-update ang quantity sa order
    orderItem.quantity = quantity;
    // STEP 11: I-compute ulit ang total price ng order
    order.totalPrice = order.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    // STEP 12: I-save ang order at i-commit ang transaction
    await order.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      message: "Order quantity updated successfully",
      data: {
        orderId: order._id,
        shoeId,
        oldQuantity,
        newQuantity: quantity,
        totalPrice: order.totalPrice,
      },
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Update order quantity error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    await session.endSession();
  }
};
const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const createOrderInformation = async (req, res) => {
  try {
    const {
      orderId,
      firstName,
      lastName,
      address,
      city,
      province,
      zipCode,
      phone,
      email,
    } = req.body;

    // 1. I-check kung valid ang Order ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // 2. Hanapin ang existing order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }
    // Check if customer information already exists for this order
    const existingInformation = await OrderSchemaInformation.findOne({
      orderId,
    });

    if (existingInformation) {
      return res.status(409).json({
        message: "Customer information already exists for this order",
      });
    }
    const cleanFirstName = toTitleCase(firstName);
    const cleanLastName = toTitleCase(lastName);
    const cleanAddress = address?.trim();
    const cleanCity = toTitleCase(city);
    const cleanProvince = toTitleCase(province);
    const cleanZipCode = zipCode?.trim();
    const cleanPhone = phone?.trim();
    const cleanEmail = email?.trim().toLowerCase();

    // 3. I-check kung kumpleto ang customer details
    if (
      !cleanFirstName ||
      !cleanLastName ||
      !cleanAddress ||
      !cleanCity ||
      !cleanProvince ||
      !cleanZipCode ||
      !cleanPhone ||
      !cleanEmail
    ) {
      return res.status(400).json({
        message: "All customer information fields are required",
      });
    }

    // 4. I-save ang customer details
    const orderInformation = await OrderSchemaInformation.create({
      orderId,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      address: cleanAddress,
      city: cleanCity,
      province: cleanProvince,
      zipCode: cleanZipCode,
      phone: cleanPhone,
      email: cleanEmail,
    });

    // 5. Ibalik ang saved information
    return res.status(201).json({
      message: "Customer information saved successfully",
      data: orderInformation,
    });
  } catch (error) {
    console.error("Create order information error:", error);

    return res.status(500).json({
      message: "Error saving customer information",
    });
  }
};

// ---------------------------------------------------------------------------
// Returns / refunds
// ---------------------------------------------------------------------------
const RETURN_WINDOW_DAYS = 7;

// Customer asks to return a delivered order
export const requestReturn = async (req, res) => {
  try {
    const reference = req.params.reference?.trim();
    const { customerAccessToken, reason } = req.body ?? {};

    if (
      !reference ||
      typeof customerAccessToken !== "string" ||
      !/^[a-f0-9]{64}$/i.test(customerAccessToken)
    ) {
      return res.status(404).json({ message: "Order not found" });
    }

    const cleanReason = typeof reason === "string" ? reason.trim() : "";
    if (cleanReason.length < 5 || cleanReason.length > 500) {
      return res.status(400).json({
        message:
          "Please tell us why you want to return this order (5-500 characters)",
      });
    }

    const order = await Order.findOne({ orderReference: reference }).select(
      "+customerAccessTokenHash",
    );

    const supplied = createHash("sha256").update(customerAccessToken).digest();
    const stored = order?.customerAccessTokenHash
      ? Buffer.from(order.customerAccessTokenHash, "hex")
      : Buffer.alloc(0);

    if (
      !order ||
      stored.length !== supplied.length ||
      !timingSafeEqual(stored, supplied)
    ) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        message: "Only delivered orders can be returned",
      });
    }

    if (order.returnStatus) {
      return res.status(409).json({
        message: "A return was already requested for this order",
      });
    }

    const deliveredAt =
      order.deliveredAt ||
      order.statusHistory?.find((entry) => entry.status === "delivered")
        ?.changedAt;

    if (
      deliveredAt &&
      Date.now() - new Date(deliveredAt).getTime() >
        RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ) {
      return res.status(400).json({
        message: `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery`,
      });
    }

    order.returnStatus = "requested";
    order.returnReason = cleanReason;
    order.returnRequestedAt = new Date();
    await order.save();

    const data = order.toObject();
    delete data.customerAccessTokenHash;

    return res.status(200).json({
      message: "Return request sent",
      data,
    });
  } catch (err) {
    console.error("REQUEST RETURN ERROR:", err);
    return res.status(500).json({ message: "Unable to send the return request" });
  }
};

// Representative approves, rejects, or marks a return as refunded
export const resolveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body ?? {};

    const nextStatus = {
      approve: "approved",
      reject: "rejected",
      refund: "refunded",
    }[decision];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!nextStatus) {
      return res.status(400).json({
        message: "Decision must be approve, reject or refund",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const allowedFrom = {
      approved: ["requested"],
      rejected: ["requested"],
      refunded: ["approved"],
    };

    if (!allowedFrom[nextStatus].includes(order.returnStatus)) {
      return res.status(400).json({
        message: "This return can't be moved to that status",
      });
    }

    order.returnStatus = nextStatus;
    order.returnResolvedAt = new Date();
    order.returnNote = typeof note === "string" ? note.trim() : "";
    await order.save();

    return res.status(200).json({
      message: "Return updated",
      data: order,
    });
  } catch (err) {
    console.error("RESOLVE RETURN ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};