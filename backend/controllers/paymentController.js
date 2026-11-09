import mongoose from "mongoose";
import Payment from "../models/payment.js";
import Order from "../models/order.js";

const recordOrderStatus = (order, status, note = "") => {
  if (order.orderStatus === status) return;
  const rank = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
  if (
    order.orderStatus === "cancelled" ||
    (rank[order.orderStatus] !== undefined &&
      rank[order.orderStatus] > rank[status])
  ) {
    return;
  }
  order.orderStatus = status;
  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    note,
  });
};

export const createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // Check if PayMongo secret key exists
    if (!process.env.PAYMONGO_SECRET_KEY) {
      console.error("PAYMONGO_SECRET_KEY is missing");

      return res.status(500).json({
        message: "Payment service is not configured",
      });
    }

    // Validate the order ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // Allow GCash only for this payment flow
    if (paymentMethod !== "GCash") {
      return res.status(400).json({
        message: "Only GCash payment is supported",
      });
    }

    // Find the order in the database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }
    // Validate the order total
    if (
      typeof order.totalPrice !== "number" ||
      !Number.isFinite(order.totalPrice) ||
      order.totalPrice <= 0
    ) {
      return res.status(400).json({
        message: "Invalid order total",
      });
    }

    // Prevent payment for an already-paid order
    if (order.paymentStatus === "completed") {
      return res.status(409).json({
        message: "This order has already been paid",
      });
    }
    // Check if this order already has a pending payment
    const existingPayment = await Payment.findOne({
      orderId: order._id,
      paymentStatus: "pending",
    });

    if (existingPayment) {
      // Check the actual payment status from PayMongo
      const statusResponse = await fetch(
        `https://api.paymongo.com/v1/payment_intents/${existingPayment.paymentIntentId}`,
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

      const statusResult = await statusResponse.json();

      // Stop if PayMongo cannot confirm the payment status
      if (!statusResponse.ok || !statusResult.data?.attributes?.status) {
        return res.status(502).json({
          message: "Unable to verify existing payment",
        });
      }

      const actualStatus = statusResult.data.attributes.status;

      // Payment was successful
      if (actualStatus === "succeeded") {
        existingPayment.paymentStatus = "completed";
        await existingPayment.save();

        order.paymentStatus = "completed";
        recordOrderStatus(order, "processing", "Payment completed");
        await order.save();

        return res.status(409).json({
          message: "This order has already been paid",
        });
      }

      // Previous payment failed, so allow a retry
      if (actualStatus === "failed") {
        existingPayment.paymentStatus = "failed";
        await existingPayment.save();

        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: "failed",
        });
      } else {
        // Payment is still processing or awaiting customer action
        return res.status(409).json({
          message: "An existing payment is still pending",
          paymentStatus: actualStatus,
        });
      }
    }

    // Create a payment intent using the actual order total
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
              amount: Math.round(order.totalPrice * 100),
              currency: "PHP",
              payment_method_allowed: ["gcash"],
            },
          },
        }),
      },
    );

    const result = await response.json();

    // Stop if PayMongo fails to create the payment intent
    if (!response.ok || !result.data) {
      return res.status(400).json({
        message: "Failed to create payment intent",
        error: result.errors || result,
      });
    }

    const paymentIntentId = result.data.id;

    // Create a GCash payment method
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

    // Stop if PayMongo fails to create the payment method
    if (!paymentMethodResponse.ok || !paymentMethodResult.data) {
      return res.status(400).json({
        message: "Failed to create payment method",
        error: paymentMethodResult.errors || paymentMethodResult,
      });
    }

    const paymentMethodId = paymentMethodResult.data.id;

    // Attach the payment method to the payment intent
    // Get and validate the frontend URL FIRST
    const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");

    if (!frontendUrl) {
      return res.status(500).json({
        message: "FRONTEND_URL is missing",
      });
    }

    let returnUrl;

    try {
      const parsedUrl = new URL(`${frontendUrl}/checkout`);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }

      returnUrl = parsedUrl.toString();
    } catch (error) {
      return res.status(500).json({
        message: "Invalid FRONTEND_URL",
      });
    }

    // Attach the payment method to the payment intent
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
              return_url: returnUrl,
            },
          },
        }),
      },
    );

    const attachResult = await attachResponse.json();

    if (!attachResponse.ok || !attachResult.data) {
      return res.status(400).json({
        message: "Failed to attach payment method",
        error: attachResult.errors || attachResult,
      });
    }

    // Read the payment status and next action from PayMongo
    const paymentStatus = attachResult.data.attributes.status;
    const nextAction = attachResult.data.attributes.next_action;

    // Save the payment details in the local database
    await Payment.create({
      orderId: orderId,
      paymentIntentId: paymentIntentId,
      paymentMethod: paymentMethod,
      paymentStatus:
        paymentStatus === "succeeded"
          ? "completed"
          : paymentStatus === "failed"
            ? "failed"
            : "pending",
    });

    // Update the order if payment succeeded
    if (paymentStatus === "succeeded") {
      order.paymentStatus = "completed";
      recordOrderStatus(order, "processing", "Payment completed");
      await order.save();
    } else if (paymentStatus === "failed") {
      order.paymentStatus = "failed";
      await order.save();
    }

    // Log whether the customer needs to complete another action
    if (paymentStatus === "awaiting_next_action") {
      console.log("Customer action is required.");
    } else if (paymentStatus === "succeeded") {
      console.log("Payment succeeded!");
    }

    if (nextAction) {
      console.log("Next action:", nextAction);
    }

    // Return the payment details to the frontend
    return res.status(201).json({
      paymentIntent: result,
      paymentMethod: paymentMethodResult,
      attachResult: attachResult,
      paymentStatus: paymentStatus,
      nextAction: nextAction,
    });
  } catch (err) {
    console.error("Create payment error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const getPaymentStatus = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    // STEP 1: Kunin ang Payment Intent ID mula sa URL.
    const { paymentIntentId } = req.params;

    if (typeof paymentIntentId !== "string" || !paymentIntentId.trim()) {
      return res.status(400).json({
        message: "Payment Intent ID is required",
      });
    }

    // STEP 2: Kunin ang kasalukuyang payment status mula sa PayMongo.
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

    // STEP 3: I-check kung successful ang request sa PayMongo.
    if (!response.ok) {
      console.error("PayMongo status request failed:", result);

      return res.status(502).json({
        message: "Failed to retrieve payment status from PayMongo",
      });
    }

    // STEP 4: Siguraduhing may payment status sa response.
    if (!result.data?.attributes?.status) {
      return res.status(502).json({
        message: "Invalid payment status response from PayMongo",
      });
    }

    const paymentStatus = result.data.attributes.status;

    if (["succeeded", "failed", "canceled"].includes(paymentStatus)) {
      session.startTransaction();
    }
    // STEP 5: Hanapin ang payment record sa MongoDB.
    const paymentQuery = Payment.findOne({
      paymentIntentId: paymentIntentId,
    });

    const payment = session.inTransaction()
      ? await paymentQuery.session(session)
      : await paymentQuery;

    // Kapag walang local payment record.
    if (!payment) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Payment record not found",
      });
    }

    // Siguraduhing umiiral pa ang order na konektado sa payment.
    if (!payment.orderId) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Associated order not found",
      });
    }
    const order = await Order.findById(payment.orderId).session(session);

    if (!order) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Associated order not found",
      });
    }

    // STEP 6: Kapag successful ang payment.
    if (paymentStatus === "succeeded") {
      payment.paymentStatus = "completed";
      await payment.save({ session });
      await Order.findByIdAndUpdate(
        payment.orderId,
        {
          paymentStatus: "completed",
          orderStatus: "processing",
        },
        { session },
      );
    }

    // STEP 7: Kapag failed o canceled ang payment.
    else if (paymentStatus === "failed" || paymentStatus === "canceled") {
      payment.paymentStatus = "failed";
      await payment.save({ session });
      order.paymentStatus = "failed";
      await order.save({ session });
    }
    if (session.inTransaction()) {
      await session.commitTransaction();
    }
    // STEP 8: Ibalik ang PayMongo response sa frontend.
    return res.status(200).json(result);
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Get payment status error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};
