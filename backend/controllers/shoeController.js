import mongoose from "mongoose";
import Shoe from "../models/shoe.js";

// Helper: Escape special characters when searching for an exact shoe name
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Helper: Convert FormData sizes into an array of numbers
const parseSizes = (sizes) => {
  if (sizes === undefined) return undefined;

  const parsedSizes =
    typeof sizes === "string" ? JSON.parse(sizes) : sizes;

  if (
    !Array.isArray(parsedSizes) ||
    !parsedSizes.every(
      (size) => Number.isFinite(Number(size)) && Number(size) > 0,
    )
  ) {
    throw new Error("Sizes must be an array of valid numbers");
  }

  return [...new Set(parsedSizes.map(Number))].sort((a, b) => a - b);
};


//createShoe
export const createShoe = async (req, res) => {
  try {
    const { name, brand, price, stock, productStatus, color, description } = req.body;
    
    const shoeGender =
      typeof req.body.gender === "string"
        ? req.body.gender.trim().toLowerCase()
        : req.body.gender;

    const shoeCategory =
      typeof req.body.category === "string"
        ? req.body.category.trim().toLowerCase()
        : req.body.category;

    // STEP 1: Check required fields
    if (
      !name ||
      !brand ||
      price === undefined ||
      !shoeGender ||
      !shoeCategory ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // STEP 2: Validate name and brand
    if (
      typeof name !== "string" ||
      typeof brand !== "string" ||
      name.trim() === "" ||
      brand.trim() === ""
    ) {
      return res.status(400).json({
        message: "Name and brand must not be empty",
      });
    }

    // STEP 3: Check empty price and stock
    if (
      (typeof price === "string" && price.trim() === "") ||
      (typeof stock === "string" && stock.trim() === "")
    ) {
      return res.status(400).json({
        message: "Price and stock must not be empty",
      });
    }

    // STEP 4: Check if price and stock are numbers or numeric strings
    if (
      (typeof price !== "number" && typeof price !== "string") ||
      (typeof stock !== "number" && typeof stock !== "string")
    ) {
      return res.status(400).json({
        message: "Price and stock must be numbers",
      });
    }

    // STEP 5: Convert and validate price and stock
    const shoePrice = Number(price);
    const shoeStock = Number(stock);

    if (
      !Number.isFinite(shoePrice) ||
      !Number.isFinite(shoeStock) ||
      shoePrice <= 0 ||
      shoeStock < 0
    ) {
      return res.status(400).json({
        message:
          "Price must be greater than zero and stock must be non-negative",
      });
    }

    // STEP 6: Stock must be a whole number
    if (!Number.isInteger(shoeStock)) {
      return res.status(400).json({
        message: "Stock must be a whole number",
      });
    }

    // STEP 7: Validate gender
    if (!["men", "women"].includes(shoeGender)) {
      return res.status(400).json({
        message: "Gender must be men or women",
      });
    }

    // STEP 8: Validate category
    if (!["running", "sports", "casual", "lifestyle"].includes(shoeCategory)) {
      return res.status(400).json({
        message: "Category must be running, sports, casual, or lifestyle",
     });
    }

    // STEP 9: Validate product status
    const normalizedStatus =
      typeof productStatus === "string"
        ? productStatus.trim().toLowerCase()
        : productStatus;

    if (
      normalizedStatus !== undefined &&
      normalizedStatus !== "" &&
      normalizedStatus !== null &&
      !["new", "popular"].includes(normalizedStatus)
    ) {
      return res.status(400).json({
        message: "Product status must be new or popular",
      });
    }

    // STEP 10: Parse and validate shoe sizes
    let shoeSizes = [];

    try {
      shoeSizes = parseSizes(req.body.sizes) ?? [];
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // STEP 11: Check duplicate shoe
    const existingShoe = await Shoe.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existingShoe) {
      return res.status(409).json({
        message: "Shoe with the same name already exists",
      });
    }

    // STEP 12: Save shoe to database
    const newShoe = await Shoe.create({
      name: name.trim(),
      brand: brand.trim(),
      price: shoePrice,
      gender: shoeGender,
      category: shoeCategory,
      stock: shoeStock,
      productStatus:
        normalizedStatus === "" || normalizedStatus === undefined
          ? null
          : normalizedStatus,
      sizes: shoeSizes,
      color: typeof color === "string" ? color.trim() : "",
      description:
        typeof description === "string" ? description.trim() : "",
      image: req.file ? `/uploads/${req.file.filename}` : "",
    });

    return res.status(201).json({
      message: "Saved successfully!",
      data: newShoe,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
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

    // STEP 1: Validate shoe ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid shoe ID",
      });
    }

    // STEP 2: Find and delete shoe
    const deletedShoe = await Shoe.findByIdAndDelete(id);

    // STEP 3: Check if shoe exists
    if (!deletedShoe) {
      return res.status(404).json({
        message: "Shoe not found",
      });
    }

    // STEP 4: Return successful response
    return res.status(200).json({
      message: "Shoe deleted successfully",
      data: deletedShoe,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting shoe",
    });
  }
};

export const updateById = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate request body
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update",
      });
    }
    // Validate allowed fields
    const allowedFields = [
      "name",
      "brand",
      "price",
      "stock",
      "gender",
      "category",
      "productStatus",
      "sizes",
      "color",
      "description",
    ];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Invalid field: ${invalidFields.join(", ")}`,
      });
    }
    // Validate shoe ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid shoe ID",
      });
    }
    const { price, stock } = req.body;

    // Validate price and stock
    if (
      (price !== undefined && price < 0) ||
      (stock !== undefined && stock < 0)
    ) {
      return res.status(400).json({
        message: "Price and stock must not be negative",
      });
    }
    // Validate price and stock numbers
    if (
      (price !== undefined &&
        (price === "" ||
          typeof price === "boolean" ||
          !Number.isFinite(Number(price)))) ||
      (stock !== undefined &&
        (stock === "" ||
          typeof stock === "boolean" ||
          !Number.isFinite(Number(stock))))
    ) {
      return res.status(400).json({
        message: "Price and stock must be valid numbers",
      });
    }
    // Validate price and stock values
    if (
      (price !== undefined && Number(price) <= 0) ||
      (stock !== undefined && !Number.isInteger(Number(stock)))
    ) {
      return res.status(400).json({
        message:
          "Price must be greater than 0 and stock must be a whole number",
      });
    }
    // Validate name and brand
    if (
      (req.body.name !== undefined &&
        (typeof req.body.name !== "string" || req.body.name.trim() === "")) ||
      (req.body.brand !== undefined &&
        (typeof req.body.brand !== "string" || req.body.brand.trim() === ""))
    ) {
      return res.status(400).json({
        message: "Name and brand must be valid text",
      });
    }
    // Check duplicate shoe name
    if (req.body.name !== undefined) {
      const escapedName = req.body.name
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const existingShoe = await Shoe.findOne({
        name: { $regex: `^${escapedName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existingShoe) {
        return res.status(409).json({
          message: "Shoe name already exists",
        });
      }
    }

    // Validate gender and category
    if (
      (req.body.gender !== undefined &&
        (typeof req.body.gender !== "string" ||
          !["men", "women"].includes(req.body.gender.trim().toLowerCase()))) ||
      (req.body.category !== undefined &&
        (typeof req.body.category !== "string" ||
          !["running", "sports", "casual", "lifestyle"].includes(
            req.body.category.trim().toLowerCase(),
          )))
    ) {
      return res.status(400).json({
        message: "Invalid gender or category",
      });
    }

    // Normalize shoe data
    if (req.body.name !== undefined) {
      req.body.name = req.body.name.trim();
    }

    if (req.body.brand !== undefined) {
      req.body.brand = req.body.brand.trim();
    }

    if (req.body.gender !== undefined) {
      req.body.gender = req.body.gender.trim().toLowerCase();
    }

    if (req.body.category !== undefined) {
      req.body.category = req.body.category.trim().toLowerCase();
    }

        // Prepare the data before updating
    const updateData = { ...req.body };

    // Convert price and stock into numbers
    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }

    if (updateData.stock !== undefined) {
      updateData.stock = Number(updateData.stock);
    }

    // Validate and normalize product status
    if (updateData.productStatus !== undefined) {
      updateData.productStatus =
        typeof updateData.productStatus === "string"
          ? updateData.productStatus.trim().toLowerCase()
          : updateData.productStatus;

      if (
        updateData.productStatus !== "" &&
        updateData.productStatus !== null &&
        !["new", "popular"].includes(updateData.productStatus)
      ) {
        return res.status(400).json({
          message: "Product status must be new or popular",
        });
      }

      if (updateData.productStatus === "") {
        updateData.productStatus = null;
      }
    }

    // Parse and validate shoe sizes
    if (updateData.sizes !== undefined) {
      try {
        updateData.sizes = parseSizes(updateData.sizes);
      } catch (error) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    // Normalize color and description
    if (updateData.color !== undefined) {
      updateData.color = updateData.color.trim();
    }

    if (updateData.description !== undefined) {
      updateData.description = updateData.description.trim();
    }

    // Add the new image path if an image was uploaded
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    const updateShoes = await Shoe.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updateShoes) {
      return res.status(404).json({
        message: "Shoe not Found",
      });
    }

    return res.status(200).json({
      message: "Shoe Updated!",
      data: updateShoes,
    });
  } catch (e) {
    // Handle errors
    if (e.name === "ValidationError" || e.name === "CastError") {
      return res.status(400).json({
        message: e.message,
      });
    }
    // Handle duplicate shoe name
    if (e.code === 11000) {
      return res.status(409).json({
        message: "Shoe name already exists",
      });
    }

    return res.status(500).json({
      message: "error",
    });
  }
};

export const getSingleShoe = async (req, res) => {
  try {
    const { id } = req.params;

    // STEP 1: Validate shoe ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid shoe ID",
      });
    }

    // STEP 2: Find shoe in database
    const shoe = await Shoe.findById(id);

    // STEP 3: Check if shoe exists
    if (!shoe) {
      return res.status(404).json({
        message: "Shoe not found",
      });
    }

    // STEP 4: Return successful response
    return res.status(200).json({
      message: "Shoe retrieved successfully",
      data: shoe,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error retrieving shoe",
    });
  }
};
