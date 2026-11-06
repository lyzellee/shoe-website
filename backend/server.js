import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import shoeRoutes from "./routes/shoes.js";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  "https://shoe-website-beige-rho.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());

// Serve uploaded shoe images
app.use("/uploads", express.static(path.resolve("uploads")));

// Routes
app.use("/api", shoeRoutes);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
  });
});
