const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth.routes");
const tenderRoutes = require("./routes/tender.routes");
const bidRoutes = require("./routes/bid.routes");
const userRoutes = require("./routes/user.routes");
const teamRoutes = require("./routes/team.routes");
const messageRoutes = require("./routes/messageRoutes");
const { cloudinary } = require("./utils/cloudinary");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Cloudinary connection check
cloudinary.api
  .ping()
  .then(() => console.log('Connected to Cloudinary'))
  .catch(err => console.error('Error connecting to Cloudinary:', err));

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "success", message: "TenderFlow API" });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/messages', messageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  const isMulterError = err?.name === 'MulterError';
  const statusCode = err.statusCode || err.status || (isMulterError ? 400 : 500);
  const exposeDetails = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    status: 'error',
    message: isMulterError ? `Upload error: ${err.message}` : (err.message || 'Internal Server Error'),
    ...(exposeDetails && { error: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

module.exports = app;
