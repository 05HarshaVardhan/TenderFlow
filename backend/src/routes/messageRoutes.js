const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { auth } = require('../middleware/auth');

// Protect all routes with authentication
router.use(auth);

// Get messages in a conversation
router.get('/', messageController.getMessages);

// Send a new message
router.post('/', messageController.sendMessage);

// Mark messages as read
router.put('/read', messageController.markAsRead);

// Get recent conversations
router.get('/conversations', messageController.getConversations);

module.exports = router;
