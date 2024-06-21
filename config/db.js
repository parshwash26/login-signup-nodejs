const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

let isConnected = false;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected...");

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
      if (!isConnected) {
        console.log("Trying to reconnect to MongoDB...");
        mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
        });
      }
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected!");
      isConnected = true;
    });

    mongoose.connection.on("close", () => {
      console.log("MongoDB connection closed");
      isConnected = false;
    });

    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
