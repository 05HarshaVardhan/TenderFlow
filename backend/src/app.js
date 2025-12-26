//src/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const authRoutes = require("./routes/auth.routes");
const tenderRoutes = require("./routes/tender.routes");
const bidRoutes = require("./routes/bid.routes");
const userRoutes = require("./routes/user.routes");
const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//Health check route
app.get("/api/health", (req, res) => {
    res.json({status: "success", message: "TenderFlow API" });
});
app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);
module.exports = app;
