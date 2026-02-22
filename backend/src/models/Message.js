const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    content: {
      type: String,
      required: true,
      trim: true,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isGroupMessage: {
      type: Boolean,
      default: false,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster querying
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipients: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
