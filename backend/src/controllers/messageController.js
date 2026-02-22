// backend/src/controllers/messageController.js
const Message = require('../models/Message');

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.user;
    const { otherUserId, teamId, limit = 50, before } = req.query;

    let query = {};
    
    if (teamId) {
      // Fetching Team Chat History
      query = { team: teamId, isGroupMessage: true };
    } else if (otherUserId) {
      // Fetching Private Chat History
      query = {
        isGroupMessage: false,
        $or: [
          { sender: userId, recipients: otherUserId },
          { sender: otherUserId, recipients: userId }
        ]
      };
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'name email')
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

// Send a new message
exports.sendMessageInternal = async (data) => {
  const { senderId, recipients, content, isGroupMessage, teamId } = data;

  const message = new Message({
    sender: senderId,
    recipients: isGroupMessage ? [] : recipients,
    content,
    isGroupMessage,
    team: isGroupMessage ? teamId : null,
    readBy: [{ user: senderId }]
  });

  await message.save();
  return await Message.findById(message._id).populate('sender', 'name email').lean();
};

// HTTP wrapper for sendMessage (if you use POST /api/messages)
exports.sendMessage = async (req, res) => {
  try {
    const populatedMessage = await exports.sendMessageInternal({
      senderId: req.user.userId,
      ...req.body
    });

    const io = req.app.get('io');
    if (req.body.isGroupMessage) {
      io.to(`team_${req.body.teamId}`).emit('newTeamMessage', populatedMessage);
    } else {
      req.body.recipients.forEach(id => io.to(id.toString()).emit('newMessage', populatedMessage));
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { messageIds } = req.body;

    if (!messageIds || !messageIds.length) {
      return res.status(400).json({ message: 'Message IDs are required' });
    }

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error updating read status' });
  }
};

// Get recent conversations
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.user;

    // Get distinct user IDs that the current user has messaged with
    const conversations = await Message.aggregate([
      {
        $match: {
          isGroupMessage: false,
          $or: [
            { sender: userId },
            { recipients: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          participants: {
            $setUnion: [
              ['$sender'],
              '$recipients'
            ]
          },
          lastMessage: '$$ROOT'
        }
      },
      {
        $unwind: '$participants'
      },
      {
        $match: {
          'participants': { $ne: userId }
        }
      },
      {
        $group: {
          _id: '$participants',
          lastMessage: { $first: '$lastMessage' },
          unreadCount: {
            $sum: {
              $cond: [
                { $not: [{ $in: [userId, '$lastMessage.readBy.user'] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          name: '$user.name',
          email: '$user.email',
          lastMessage: 1,
          unreadCount: 1
        }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};
