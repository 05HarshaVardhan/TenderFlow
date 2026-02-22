require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { authenticateSocket } = require('./middleware/auth');
const { sendMessageInternal } = require('./controllers/messageController');
const Team = require('./models/Team'); // Needed to auto-join rooms
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  
  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    authenticateSocket(socket, next);
  });

  // Store connected users
  const connectedUsers = new Map();

  // Handle socket connections
  io.on('connection', async(socket) => {
    console.log('New client connected:', socket.userId);
    
    // Add user to connected users
    if (socket.userId) {
      connectedUsers.set(socket.userId.toString(), socket.id);
      // AUTO-JOIN TEAM ROOMS on connection
      try {
        const teams = await Team.find({ members: socket.userId }).select('_id');
        teams.forEach(t => socket.join(`team_${t._id}`));
      } catch (err) {
        console.error("Error joining team rooms:", err);
      }

      io.emit('userStatus', { userId: socket.userId, status: 'online' });
    }
    socket.on('joinTeam', (teamId) => {
      socket.join(`team_${teamId}`);
      console.log(`User ${socket.userId} joined team: ${teamId}`);
    });
    // Handle private messages
    socket.on('privateMessage', async (data) => {
      try {
        const savedMsg = await sendMessageInternal({
          senderId: socket.userId,
          recipients: [data.recipientId],
          content: data.content,
          isGroupMessage: false
        });

        const recipientSocketId = connectedUsers.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('newMessage', savedMsg);
        }
        // Send back to sender for confirmation
        socket.emit('newMessage', savedMsg); 
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    // Handle Team Messages (SAVE + EMIT)
    socket.on('sendTeamMessage', async (data) => {
      try {
        const savedMsg = await sendMessageInternal({
          senderId: socket.userId,
          teamId: data.teamId,
          content: data.content,
          isGroupMessage: true
        });

        io.to(`team_${data.teamId}`).emit('newTeamMessage', savedMsg);
      } catch (error) {
        console.error('Team message error:', error);
      }
    });
    // Handle typing indicators
    socket.on('typing', (data) => {
      if (data.teamId) {
        socket.to(`team_${data.teamId}`).emit('userTyping', { userId: socket.userId, isTyping: data.isTyping, teamId: data.teamId });
      } else {
        const recipientSocketId = connectedUsers.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('userTyping', { userId: socket.userId, isTyping: data.isTyping });
        }
      }
    });

    

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId.toString());
        io.emit('userStatus', { userId: socket.userId, status: 'offline', lastSeen: new Date() });
      }
    });
  });

  // Attach io instance to app for use in controllers
  app.set('io', io);

  // Start the server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
