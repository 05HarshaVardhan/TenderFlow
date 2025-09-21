const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

const authRoutes = require('./routes/auth.routes.js');
const companyRoutes = require('./routes/company.routes.js');
const tenderRoutes = require('./routes/tender.route.js');
const applicationRoutes = require('./routes/application.route.js');
const dashboardRoutes = require('./routes/dashboard.route.js'); // ✅ NEW

const scheduleTenderExpiryJob = require('./jobs/tenderExpiryJob');

const app = express();

// ✅ Middleware (order matters)
// Add this at the very start of your backend entry file (e.g., index.js)

try {
  require('pg');
  console.log('✅ pg module IS accessible at runtime');
} catch (err) {
  console.error('❌ pg module is MISSING:', err.message);
}

// Also, log current working directory to ensure correct project folder
console.log('Current working directory:', process.cwd());

app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true
}));

app.use(cookieParser());
app.use(express.json()); // ✅ Must come before routes that need req.body

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dashboard', dashboardRoutes); // ✅ Mount it on /api/dashboard not just /api

// ✅ Background Jobs
scheduleTenderExpiryJob();

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
