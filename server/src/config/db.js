const mongoose = require("mongoose");

const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB Connected");
      return;
    } catch (error) {
      console.error(`MongoDB Connection Error (Retries left: ${retries - 1}):`, error.message);
      retries -= 1;
      if (retries === 0) {
        console.error("Could not connect to MongoDB after multiple attempts.");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;