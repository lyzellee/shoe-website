import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

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
  createOrderInformation,
} from "../controllers/orderController.js";

import {
  createPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js";

import { login, registerUser } from "../controllers/authController.js";
//client
const router = express.Router();
router.get("/all", getAllShoes);
router.get("/men", getMenShoes);
router.get("/women", getWomenShoes);
router.post("/orders", createOrder);
router.get("/single/:id", getSingleShoe);

// admin
router.put(
  "/update/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  updateById,
);
router.get(
  "/payment/:paymentIntentId",
  verifyToken,
  allowRoles("admin", "representative"),
  getPaymentStatus,
);
router.post("/payment", createPayment);
router.post("/order-information", createOrderInformation);
router.patch(
  "/orders/quantity",
  verifyToken,
  allowRoles("admin", "representative"),
  updateOrderItemQuantity,
);
router.delete(
  "/orders/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  deleteOrderById,
);
router.delete("/:id", verifyToken, allowRoles("admin"), deleteById);
router.get(
  "/orders",
  verifyToken,
  allowRoles("admin", "representative"),
  getAllOrder,
);
router.post("/shoes", verifyToken, allowRoles("admin"), createShoe);
router.post("/login", login);
router.post("/register", verifyToken, allowRoles("admin"), registerUser);

export default router;
