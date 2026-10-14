import express from "express";
import {
  createShoe,
  deleteById,
  getAllShoes,
  getMenShoes,
  getSingleShoe,
  getWomenShoes,
  updateById,
  getAllOrder,
  createOrder,
  createPayment,
  testFetch,
  getPaymentStatus,
  deleteOrderById,
} from "../controllers/shoeController.js";
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

export default router;
