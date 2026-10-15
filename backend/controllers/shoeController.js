import mongoose from "mongoose";
import Shoe from "../models/shoe.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";

export const createShoe = async (req, res) => {
  const { name, brand, price, gender, category, stock } = req.body;
  const newShoe = await Shoe.create({
    name,
    brand,
    price: Number(price),
    gender,
    category,
    stock: Number(stock),
  });
  res.status(201).json({ message: " Saved successfully!", data: newShoe });
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
    const updateShoes = await Shoe.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updateShoes) {
      return res.status(404).json({ message: "Shoe not Found" });
    }
    res.status(200).json({ message: "Shoe Updated!" });
  } catch (e) {
    res.status(500).json({ message: "error" });
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

    // 1. Validate muna bago simulan ang transaction.
    if (!orderReference || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Order must contain at least one item",
      });
    }

    // 2. Isang beses lang sisimulan ang transaction.
    session.startTransaction();

    // 3. Check kung existing na ang order reference.
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
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be a positive whole number",
        });
      }
      console.log("ITEMS CHECK PASSED");
      const shoe = await Shoe.findById(item.shoeId).session(session);
      if (!shoe) {
        return res.status(404).json({
          message: "Shoe not found",
        });
      }
      if (shoe.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${shoe.name}. Available: ${shoe.stock}`,
        });
      }
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
      item.price = shoe.price;
      computedTotalPrice += shoe.price * item.quantity;
    }
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

    // Kumpirmahin ang stock deduction at order creation.
    await session.commitTransaction();

    res
      .status(201)
      .json({ message: "Order created successfully!", data: newOrder });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Create order error:", err);

    res.status(500).json({
      message: "Error creating order",
    });
  } finally {
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
