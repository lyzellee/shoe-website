import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import shoeRoutes from "./routes/shoes.js";
import helmet from "helmet";

const app = express();

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(helmet());

// Serve uploaded shoe images
app.use("/uploads", express.static(path.resolve("uploads")));

// Routes
app.use("/api", shoeRoutes);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(5000, () => {
    console.log("Server running on port 5000");
  });
});
