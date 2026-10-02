import mongoose from "mongoose";


const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://shoe-store:shoe123@ac-oach4k2-shard-00-00.oeltg4v.mongodb.net:27017/shoe-store?ssl=true&replicaSet=atlas-kzmlje-shard-0&authSource=admin&appName=Cluster0",
    );
    console.log("Successfully connected to MongoDB");
  } catch (err) {
    console.error("Database connection error", err);
  }
};


export default connectDB;


