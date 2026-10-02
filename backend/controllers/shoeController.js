import Shoe from "../models/shoe.js";

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
      category: category,
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
    const { category } = req.params;
    const womenShoes = await Shoe.find({
      gender: "women",
      category: category,
    });
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
export const createOrder = async (req, res) => {};
export const getUserOrder = async (req, res) => {};
export const getAllOrder = async (req, res) => {};

