import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get user's notifications
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    const query = {
      recipient: currentUserId,
      isDeleted: false
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(currentUserId);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const unreadCount = await Notification.getUnreadCount(currentUserId);
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Mark notifications as read
router.put('/mark-read', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { notificationIds } = req.body; // Optional: specific notification IDs

    await Notification.markAsRead(currentUserId, notificationIds);
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

// Mark single notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: currentUserId
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Delete notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: currentUserId
      },
      { isDeleted: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { type } = req.query; // Optional: delete by type

    const query = {
      recipient: currentUserId,
      isDeleted: false
    };

    if (type) {
      query.type = type;
    }

    await Notification.updateMany(query, { isDeleted: true });

    res.json({ message: 'Notifications deleted' });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Failed to delete notifications' });
  }
});

export default router; 