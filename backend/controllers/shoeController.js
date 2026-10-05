import Shoe from "../models/shoe.js";
import Order from "../models/order.js";

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
  try {
    const { orderReference, items } = req.body;

    if (!orderReference || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
      });
    }
    const existingOrder = await Order.findOne({ orderReference });
    if (existingOrder) {
      return res.status(409).json({
        message: "Order reference already exists",
      });
    }

    if (!orderReference || orderReference.trim() === "") {
      return res.status(400).json({
        message: "Order reference is required",
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain at least one item",
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
      const shoe = await Shoe.findById(item.shoeId);
      if (!shoe) {
        return res.status(404).json({
          message: "Shoe not found",
        });
      }
      item.price = shoe.price;
      computedTotalPrice += shoe.price * item.quantity;
    }
    const newOrder = await Order.create({
      orderReference,
      items,
      totalPrice: computedTotalPrice,
    });

    res
      .status(201)
      .json({ message: "Order created successfully!", data: newOrder });
  } catch (err) {
    res.status(500).json({ message: "Error creating order" });
  }
};
export const getUserOrder = async (req, res) => {};

export const getAllOrder = async (req, res) => {
  try {
    const orders = await Order.find();

    console.log("All orders fetched successfully:", orders);

    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ALL ORDER ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
