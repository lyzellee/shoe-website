import mongoose from "mongoose";
import Shoe from "../models/shoe.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";

export const createShoe = async (req, res) => {
  try {
    const { name, brand, price, stock } = req.body;
    const shoeGender =
      typeof req.body.gender === "string"
        ? req.body.gender.trim().toLowerCase()
        : req.body.gender;

    const shoeCategory =
      typeof req.body.category === "string"
        ? req.body.category.trim().toLowerCase()
        : req.body.category;

    // STEP 1: Check required fields
    if (
      !name ||
      !brand ||
      price === undefined ||
      !shoeGender ||
      !shoeCategory ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // STEP 2: Validate name and brand
    if (
      typeof name !== "string" ||
      typeof brand !== "string" ||
      name.trim() === "" ||
      brand.trim() === ""
    ) {
      return res.status(400).json({
        message: "Name and brand must not be empty",
      });
    }

    // STEP 3: Check empty price and stock
    if (
      (typeof price === "string" && price.trim() === "") ||
      (typeof stock === "string" && stock.trim() === "")
    ) {
      return res.status(400).json({
        message: "Price and stock must not be empty",
      });
    }

    // STEP 4: Check if price and stock are numbers or numeric strings
    if (
      (typeof price !== "number" && typeof price !== "string") ||
      (typeof stock !== "number" && typeof stock !== "string")
    ) {
      return res.status(400).json({
        message: "Price and stock must be numbers",
      });
    }

    // STEP 5: Convert and validate price and stock
    const shoePrice = Number(price);
    const shoeStock = Number(stock);

    if (
      !Number.isFinite(shoePrice) ||
      !Number.isFinite(shoeStock) ||
      shoePrice <= 0 ||
      shoeStock < 0
    ) {
      return res.status(400).json({
        message:
          "Price must be greater than zero and stock must be non-negative",
      });
    }

    // STEP 6: Stock must be a whole number
    if (!Number.isInteger(shoeStock)) {
      return res.status(400).json({
        message: "Stock must be a whole number",
      });
    }

    // STEP 7: Validate gender
    if (!["men", "women"].includes(shoeGender)) {
      return res.status(400).json({
        message: "Gender must be men or women",
      });
    }

    // STEP 8: Validate category
    if (!["running", "sports"].includes(shoeCategory)) {
      return res.status(400).json({
        message: "Category must be running or sports",
      });
    }
    // STEP 9: Check duplicate shoe
    const existingShoe = await Shoe.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existingShoe) {
      return res.status(409).json({
        message: "Shoe with the same name already exists",
      });
    }

    // STEP 10: Save shoe to database
    const newShoe = await Shoe.create({
      name: name.trim(),
      brand: brand.trim(),
      price: shoePrice,
      gender: shoeGender,
      category: shoeCategory,
      stock: shoeStock,
    });

    return res.status(201).json({
      message: "Saved successfully!",
      data: newShoe,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

export const getAllShoes = async (req, res) => {
  try {
    const shoes = await Shoe.find();
    res.status(200).json(shoes);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getMenShoes = async (req, res) => {
  try {
    const { category } = req.params;
    const menShoes = await Shoe.find({
      gender: "men",
    });
    res.status(200).json(menShoes);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getWomenShoes = async (req, res) => {
  try {
    const womenShoes = await Shoe.find({
      gender: "women",
    });
    console.log("Women's shoes fetched successfully:", womenShoes);
    res.status(200).json(womenShoes);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
export const deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteShoe = await Shoe.findByIdAndDelete(id);
    if (!deleteShoe) {
      return res.status(404).json({ message: "Shoe not found" });
    }
    res.status(200).json({ message: "Shoe Deleted succesfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateById = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate request body
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update",
      });
    }
    // Validate allowed fields
    const allowedFields = [
      "name",
      "brand",
      "price",
      "stock",
      "gender",
      "category",
    ];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Invalid field: ${invalidFields.join(", ")}`,
      });
    }
    // Validate shoe ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid shoe ID",
      });
    }
    const { price, stock } = req.body;

    // Validate price and stock
    if (
      (price !== undefined && price < 0) ||
      (stock !== undefined && stock < 0)
    ) {
      return res.status(400).json({
        message: "Price and stock must not be negative",
      });
    }
    // Validate price and stock numbers
    if (
      (price !== undefined &&
        (price === "" ||
          typeof price === "boolean" ||
          !Number.isFinite(Number(price)))) ||
      (stock !== undefined &&
        (stock === "" ||
          typeof stock === "boolean" ||
          !Number.isFinite(Number(stock))))
    ) {
      return res.status(400).json({
        message: "Price and stock must be valid numbers",
      });
    }
    // Validate price and stock values
    if (
      (price !== undefined && Number(price) <= 0) ||
      (stock !== undefined && !Number.isInteger(Number(stock)))
    ) {
      return res.status(400).json({
        message:
          "Price must be greater than 0 and stock must be a whole number",
      });
    }
    // Validate name and brand
    if (
      (req.body.name !== undefined &&
        (typeof req.body.name !== "string" || req.body.name.trim() === "")) ||
      (req.body.brand !== undefined &&
        (typeof req.body.brand !== "string" || req.body.brand.trim() === ""))
    ) {
      return res.status(400).json({
        message: "Name and brand must be valid text",
      });
    }
    // Check duplicate shoe name
    if (req.body.name !== undefined) {
      const escapedName = req.body.name
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const existingShoe = await Shoe.findOne({
        name: { $regex: `^${escapedName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existingShoe) {
        return res.status(409).json({
          message: "Shoe name already exists",
        });
      }
    }

    // Validate gender and category
    if (
      (req.body.gender !== undefined &&
        (typeof req.body.gender !== "string" ||
          !["men", "women"].includes(req.body.gender.trim().toLowerCase()))) ||
      (req.body.category !== undefined &&
        (typeof req.body.category !== "string" ||
          !["running", "sports"].includes(
            req.body.category.trim().toLowerCase(),
          )))
    ) {
      return res.status(400).json({
        message: "Invalid gender or category",
      });
    }
    // Normalize shoe data
    if (req.body.name !== undefined) {
      req.body.name = req.body.name.trim();
    }

    if (req.body.brand !== undefined) {
      req.body.brand = req.body.brand.trim();
    }

    if (req.body.gender !== undefined) {
      req.body.gender = req.body.gender.trim().toLowerCase();
    }

    if (req.body.category !== undefined) {
      req.body.category = req.body.category.trim().toLowerCase();
    }
    const updateShoes = await Shoe.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updateShoes) {
      return res.status(404).json({
        message: "Shoe not Found",
      });
    }

    return res.status(200).json({
      message: "Shoe Updated!",
      data: updateShoes,
    });
  } catch (e) {
    // Handle errors
    if (e.name === "ValidationError" || e.name === "CastError") {
      return res.status(400).json({
        message: e.message,
      });
    }

    return res.status(500).json({
      message: "error",
    });
  }
};
export const getSingleShoe = async (req, res) => {
  try {
    const { id } = req.params;
    const getOne = await Shoe.findById(id);
    res.status(200).json(getOne);
  } catch (err) {
    res.status(500).json({ message: "error" });
  }
};
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { orderReference, items } = req.body;

    // Validate order reference
    if (!orderReference || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
      });
    }

    // Validate order items
    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Order must contain at least one item",
      });
    }

    // Start transaction
    session.startTransaction();

    // Check duplicate order reference
    const existingOrder = await Order.findOne({ orderReference }, null, {
      session,
    });

    if (existingOrder) {
      await session.abortTransaction();

      return res.status(409).json({
        message: "Order reference already exists",
      });
    }

    let computedTotalPrice = 0;

    // Validate each order item
    for (const item of items) {
      // Validate quantity
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be a positive whole number",
        });
      }

      console.log("ITEMS CHECK PASSED");

      // Find shoe
      const shoe = await Shoe.findById(item.shoeId).session(session);

      if (!shoe) {
        return res.status(404).json({
          message: "Shoe not found",
        });
      }

      // Check available stock
      if (shoe.stock < item.quantity) {
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
          new: true,
          session,
        },
      );

      if (!updatedShoe) {
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
          orderReference,
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
      data: newOrder,
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

    console.log("All orders fetched successfully:", orders);

    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ALL ORDER ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getSingleOrder = async (req, res) => {};

export const deleteOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOrder = await Order.findByIdAndDelete(id);
    if (!deleteOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ message: "Order Deleted succesfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const response = await fetch(
      "https://api.paymongo.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: 750000,
              currency: "PHP",
              payment_method_allowed: ["gcash"],
            },
          },
        }),
      },
    );
    const result = await response.json();
    const paymentIntentId = result.data.id;
    console.log("Payment Intent ID:", paymentIntentId);

    const paymentMethodResponse = await fetch(
      "https://api.paymongo.com/v1/payment_methods",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: "gcash",
            },
          },
        }),
      },
    );

    const paymentMethodResult = await paymentMethodResponse.json();
    const paymentMethodId = paymentMethodResult.data.id;

    console.log("Payment Method ID:", paymentMethodId);

    const attachResponse = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: paymentMethodId,
              return_url: "http://localhost:5173/checkout",
            },
          },
        }),
      },
    );

    const attachResult = await attachResponse.json();
    console.log("Attach Result:", attachResult);
    const paymentStatus = attachResult.data.attributes.status;

    await Payment.create({
      orderId: orderId,
      paymentIntentId: paymentIntentId,
      paymentMethod: paymentMethod,
      paymentStatus: "pending",
    });
    const nextAction = attachResult.data.attributes.next_action;
    if (paymentStatus === "awaiting_next_action") {
      console.log("Customer action is required.");
    } else if (paymentStatus === "succeeded") {
      console.log("Payment succeeded!");
    }

    if (nextAction) {
      console.log("Next action:", nextAction);
    }

    res.status(201).json({
      paymentIntent: result,
      paymentMethod: paymentMethodResult,
      attachResult: attachResult,
      paymentStatus: paymentStatus,
      nextAction: nextAction,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error connecting to PayMongo", error: err.message });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const response = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
      },
    );

    const result = await response.json();
    // 3. Ibalik ang error kung pumalya ang PayMongo request
    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    // 4. Kunin ang status na galing sa PayMongo
    const paymentStatus = result.data.attributes.status;

    // 5. I-update ang local Payment record kapag successful
    if (paymentStatus === "succeeded") {
      await Payment.findOneAndUpdate(
        { paymentIntentId: paymentIntentId },
        { paymentStatus: "completed" },
        { new: true },
      );
    }

    // Ibalik ang response ni PayMongo
    res.status(response.status).json(result);
  } catch (err) {
    console.log("PayMongo Error:", err);
    res
      .status(500)
      .json({ message: "Error checking payment status", error: err.message });
  }
};
export const updateOrderItemQuantity = async (req, res) => {
  try {
    const { orderId, shoeId, quantity } = req.body;
  } catch (err) {
    console.error("Message:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};
