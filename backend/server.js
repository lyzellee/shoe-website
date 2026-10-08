import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import shoeRoutes from "./routes/shoes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", shoeRoutes);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(5000, () => {
    console.log("Server running on port 5000");
  });
});
