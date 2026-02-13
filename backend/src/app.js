//src/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const authRoutes = require("./routes/auth.routes");
const tenderRoutes = require("./routes/tender.routes");
const bidRoutes = require("./routes/bid.routes");
const userRoutes = require("./routes/user.routes");
const { cloudinary } = require("./utils/cloudinary");
const app = express();

//Middleware
app.use(cors({
  origin: 'http://localhost:5173',   // exact frontend origin
  credentials: true                  // REQUIRED for cookies
}));
app.use(express.json());
// Cloudinary connection check
cloudinary.api.ping()
  .then(() => console.log('Connected to Cloudinary'))
  .catch(err => console.error('Error connecting to Cloudinary:', err));

//Health check route
app.get("/api/health", (req, res) => {
    res.json({status: "success", message: "TenderFlow API" });
});
app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
