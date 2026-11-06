import mongoose from "mongoose";

const connectDB = async () => {
  console.log("PayMongo key loaded:", !!process.env.PAYMONGO_SECRET_KEY);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Successfully connected to MongoDB");
  } catch (err) {
    console.error("Database connection error", err);
  }
};

export default connectDB;
