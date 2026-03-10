// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000
  });
  console.log("MongoDB connected");
};

module.exports = connectDB;
