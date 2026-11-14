import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import validateImage from "../middleware/validateImage.js";

import { getDashboardStats } from "../controllers/dashBoardController.js";
import {
  createTesterFeedback,
  getAllTesterFeedback,
  deleteTesterFeedback,
} from "../controllers/testerFeedbackController.js";

import {
  createUserFeedback,
  getAllUserFeedback,
  deleteUserFeedback,
} from "../controllers/userFeedbackController.js";
import {
  createShoe,
  deleteById,
  getAllShoes,
  getMenShoes,
  getSingleShoe,
  getWomenShoes,
  updateById,
  restoreById,
} from "../controllers/shoeController.js";

import {
  createOrder,
  getAllOrder,
  updateOrderStatus,
  getCustomerOrders,
  cancelCustomerOrder,
  getSingleOrder,
  deleteOrderById,
  updateOrderItemQuantity,
  createOrderInformation,
  requestReturn,
  resolveReturn,
} from "../controllers/orderController.js";

import {
  createPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js";

import {
  login,
  registerUser,
  updateInformation,
} from "../controllers/authController.js";

import {
  createShoe,
  deleteById,
  getAllShoes,
  getMenShoes,
  getSingleShoe,
  getWomenShoes,
  updateById,
  restoreById,
  permanentDeleteById, // <-- add
} from "../controllers/shoeController.js";

//client
const router = express.Router();
router.get("/all", getAllShoes);
router.get("/men", getMenShoes);
router.get("/women", getWomenShoes);
router.post("/orders", createOrder);
router.post("/customer-orders", getCustomerOrders);
router.patch("/customer-orders/:reference/cancel", cancelCustomerOrder);
router.get("/single/:id", getSingleShoe);
//user-feedback
router.post("/create-userfb", createUserFeedback);
router.get("/get-userfb", getAllUserFeedback);

router.delete(
  "/delete-userfb/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  deleteUserFeedback,
);

//tester-feedback
router.post("/create-testfb", createTesterFeedback);
router.get("/get-testfb", getAllTesterFeedback);
router.delete("/delete-testfb/:id", deleteTesterFeedback);

// admin
router.put(
  "/update/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  upload.single("image"),
  updateById,
);

router.get("/payment/:paymentIntentId", getPaymentStatus);

router.post("/payment", createPayment);
router.post("/order-information", createOrderInformation);

router.patch(
  "/orders/quantity",
  verifyToken,
  allowRoles("admin", "representative"),
  updateOrderItemQuantity,
);
router.patch(
  "/orders/:id/status",
  verifyToken,
  allowRoles("admin", "representative"),
  updateOrderStatus,
);
router.delete(
  "/orders/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  deleteOrderById,
);

router.delete("/:id", verifyToken, allowRoles("admin"), deleteById);

router.patch(
  "/restore/:id",
  verifyToken,
  allowRoles("admin", "representative"),
  restoreById,
);

router.delete(
  "/permanent/:id",
  verifyToken,
  allowRoles("admin"),
  permanentDeleteById,
);

router.get(
  "/orders",
  verifyToken,
  allowRoles("admin", "representative"),
  getAllOrder,
);

// Create shoe with image upload
router.post(
  "/shoes",
  verifyToken,
  allowRoles("admin"),
  upload.single("image"),
  validateImage,
  createShoe,
);
router.post("/login", login);
router.post("/register", verifyToken, allowRoles("admin"), registerUser);
router.put(
  "/update-information",
  verifyToken,
  allowRoles("admin", "representative"),
  updateInformation,
);

router.get(
  "/dashboard-stats",
  verifyToken,
  allowRoles("admin", "representative"),
  getDashboardStats,
);

router.patch("/customer-orders/:reference/return", requestReturn);
router.patch(
  "/orders/:id/return",
  verifyToken,
  allowRoles("admin", "representative"),
  resolveReturn,
);

export default router;
