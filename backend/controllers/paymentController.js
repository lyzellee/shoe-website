import mongoose from "mongoose";
import Payment from "../models/payment.js";
import Order from "../models/order.js";

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

        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: "completed",
          orderStatus: "processing",
        });

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
              return_url: `${process.env.FRONTEND_URL}/checkout`,
            },
          },
        }),
      },
    );

    const attachResult = await attachResponse.json();

    // Stop if PayMongo fails to attach the payment method
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
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "completed",
        orderStatus: "processing",
      });
    } else if (paymentStatus === "failed") {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
      });
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
  try {
    // STEP 1: Kunin ang Payment Intent ID mula sa URL.
    //
    // Halimbawa:
    // GET /api/payment/pi_123
    //
    // Sa route na ito, ang "pi_123" ang paymentIntentId.
    const { paymentIntentId } = req.params;
    // Siguraduhing may Payment Intent ID bago tumawag sa PayMongo.
    if (typeof paymentIntentId !== "string" || !paymentIntentId.trim()) {
      return res.status(400).json({
        message: "Payment Intent ID is required",
      });
    }

    // STEP 2: Humingi ng kasalukuyang status sa PayMongo.
    // Hindi sapat na umasa lang sa status na nasa frontend.
    const response = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      {
        method: "GET",

        headers: {
          // Secret key ay nananatili sa backend.
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
      },
    );

    // I-convert ang response sa JavaScript object.
    const result = await response.json();

    // STEP 3: Ibalik ang error kung pumalya ang PayMongo request.
    if (!response.ok) {
      console.error("PayMongo status request failed:", result);

      return res.status(502).json({
        message: "Failed to retrieve payment status from PayMongo",
      });
    }

    // Siguraduhing may Payment Intent data bago kunin ang status.
    if (!result.data?.attributes?.status) {
      return res.status(502).json({
        message: "Invalid payment status response from PayMongo",
      });
    }

    // Kunin ang status pagkatapos ma-validate ang response.
    const paymentStatus = result.data.attributes.status;

    // STEP 5: Hanapin ang katumbas na payment record sa MongoDB.
    // Ginagamit ang Payment Intent ID para maitugma ang record.
    const payment = await Payment.findOne({
      paymentIntentId: paymentIntentId,
    });

    // Kapag walang local payment record, hindi natin alam
    // kung anong local order ang dapat i-update.
    if (!payment) {
      return res.status(404).json({
        message: "Payment record not found",
      });
    }

    // STEP 6: Kapag succeeded ang status mula sa PayMongo,
    // markahan ang local payment at order bilang completed.
    if (paymentStatus === "succeeded") {
      payment.paymentStatus = "completed";
      await payment.save();

      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "completed",
        orderStatus: "processing",
      });
    }

    // STEP 7: Ang kasalukuyang code ay minamarkahang failed
    // ang mga status na ito.
    //
    // IMPORTANT:
    // Ang "awaiting_payment_method" ay maaaring mangahulugan
    // na naghihintay pa ng payment method, hindi palaging failed.
    // Kailangang i-review ang status mapping bago production.
    else if (paymentStatus === "failed") {
      payment.paymentStatus = "failed";
      await payment.save();

      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "failed",
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    // Mahuhuli rito ang unexpected errors habang
    // kumukuha o nagpoproseso ng payment status.
    console.error("Get payment status error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
