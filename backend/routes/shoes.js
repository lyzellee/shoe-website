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
} from "../controllers/shoeController.js";
const router = express.Router();
router.get("/all", getAllShoes);
router.post("/shoes", createShoe);
router.get("/men", getMenShoes);
router.get("/women", getWomenShoes);
router.post("/orders", createOrder);
router.get("/orders", getAllOrder);
router.delete("/:id", deleteById);
router.delete("/orders/:id", deleteById);
router.get("/:id", getSingleShoe);
router.put("/update/:id", updateById);

export default router;
