// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); 

  }); 
  console.log(`hey tanu welcome to harsh's workspace`);
  // later we will attach Socket.IO to `server` for real-time bids
}

startServer();
