const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };
    if (String(req.query.unreadOnly || '').toLowerCase() === 'true') {
      query.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user.id, isRead: false })
    ]);

    return res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + items.length < total
      },
      unreadCount
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

module.exports = router;
