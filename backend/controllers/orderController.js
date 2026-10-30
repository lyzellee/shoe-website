import mongoose from "mongoose";
import Shoe from "../models/shoe.js";
import Order from "../models/order.js";
import OrderSchemaInformation from "../models/orderInformation.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { orderReference, items } = req.body;

    // Validate order reference
    if (typeof orderReference !== "string" || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
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
        },
      ],
      { session },
    );

    // Commit transaction
    await session.commitTransaction();

    // Return success response
    res.status(201).json({
      message: "Order created successfully!",
      data: newOrder[0],
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
    const orders = await Order.find().populate("items.shoeId");

    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ALL ORDER ERROR:", err);

    res.status(500).json({
      message: "Internal server error",
    });
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
    // STEP 4.1: Prevent deletion of paid orders
    if (order.paymentStatus === "completed") {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Paid orders cannot be deleted",
      });
    }
    // STEP 4: Only pending orders can be deleted
    if (order.orderStatus !== "pending") {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Only pending orders can be deleted",
      });
    }

    // STEP 5: Restore stock for each order item
    for (const item of order.items) {
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

    // STEP 6: Delete order
    await Order.findByIdAndDelete(id).session(session);

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

    // 3. I-check kung kumpleto ang customer details
    if (
      !firstName ||
      !lastName ||
      !address ||
      !city ||
      !province ||
      !zipCode ||
      !phone ||
      !email
    ) {
      return res.status(400).json({
        message: "All customer information fields are required",
      });
    }

    // 4. I-save ang customer details
    const orderInformation = await OrderSchemaInformation.create({
      orderId,
      firstName,
      lastName,
      address,
      city,
      province,
      zipCode,
      phone,
      email,
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
