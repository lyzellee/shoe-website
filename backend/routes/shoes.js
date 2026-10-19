import express from "express";

import {
  createShoe,
  deleteById,
  getAllShoes,
  getMenShoes,
  getSingleShoe,
  getWomenShoes,
  updateById,
} from "../controllers/shoeController.js";

import {
  createOrder,
  getAllOrder,
  getSingleOrder,
  deleteOrderById,
  updateOrderItemQuantity,
} from "../controllers/orderController.js";

import {
  createPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js";

const router = express.Router();
router.get("/all", getAllShoes);
router.post("/shoes", createShoe);
router.get("/men", getMenShoes);
router.get("/women", getWomenShoes);
router.post("/orders", createOrder);
router.get("/orders", getAllOrder);
router.post("/payment", createPayment);
router.get("/payment/:paymentIntentId", getPaymentStatus);
router.delete("/:id", deleteById);
router.delete("/orders/:id", deleteOrderById);
router.get("/single/:id", getSingleShoe);
router.put("/update/:id", updateById);
router.patch("/orders/quantity", updateOrderItemQuantity);

export default router;
