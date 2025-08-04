import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// GET /conversation/:userId - Get messages between current user and another user
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, before } = req.query;
    
    console.log('📥 Fetching conversation:', {
      userId,
      limit,
      before,
      currentUser: req.user._id
    });
    
    // Validate user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build query for messages between these two users
    const query = {
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    };

    // Add pagination filter if 'before' parameter is provided
    if (before) {
      query.createdAt = { $lt: new Date(before) };
      console.log('📅 Pagination filter added for messages before:', before);
    }

    console.log('🔍 Query:', JSON.stringify(query, null, 2));

    // Get messages with pagination, sorted by newest first
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Newest first for pagination
      .limit(parseInt(limit))
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar');

    // Reverse the order to show oldest first in the UI
    const reversedMessages = messages.reverse();

    console.log('📨 Returning', reversedMessages.length, 'messages');
    
    // Log the date range of returned messages for debugging
    if (reversedMessages.length > 0) {
      const oldestMsg = reversedMessages[0];
      const newestMsg = reversedMessages[reversedMessages.length - 1];
      console.log('📅 Message date range:', {
        oldest: oldestMsg.createdAt,
        newest: newestMsg.createdAt,
        before: before
      });
    }

    res.json({ messages: reversedMessages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// Get recent conversations
router.get('/conversations', async (req, res) => {
  try {
    // Get the latest message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ],
          isDeleted: false
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', req.user._id] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
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
        $limit: 20
      }
    ]);

    // Populate user information
    const populatedConversations = await Message.populate(conversations, [
      {
        path: 'lastMessage.sender',
        select: 'firstName lastName avatar'
      },
      {
        path: 'lastMessage.receiver',
        select: 'firstName lastName avatar'
      },
      {
        path: '_id',
        select: 'firstName lastName avatar isOnline lastSeen',
        model: 'User'
      }
    ]);

    res.json({ conversations: populatedConversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/:messageId', async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete the message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    const { forEveryone } = req.query;
    const isRecentMessage = (new Date() - new Date(message.createdAt)) <= (2 * 60 * 1000); // 2 minutes

    if (forEveryone === 'true' && isRecentMessage) {
      // Delete for everyone (both sender and receiver)
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Notify receiver about message deletion
      const receiver = await User.findById(message.receiver);
      if (receiver && receiver.socketId) {
        req.app.get('io').to(`user_${message.receiver}`).emit('message_deleted', {
          messageId: message._id,
          deletedBy: req.user._id
        });
      }

      res.json({ message: 'Message deleted for everyone' });
    } else {
      // Delete for sender only (soft delete)
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      res.json({ message: 'Message deleted for yourself' });
    }

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark message as read
router.put('/:messageId/read', async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: 'Message marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread message count
router.get('/unread/count', async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
      isDeleted: false
    });

    res.json({ unreadCount: count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    console.log('📝 Adding reaction:', { messageId, emoji, userId: req.user._id });
    
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      reaction => reaction.userId.toString() === req.user._id.toString() && reaction.emoji === emoji
    );
    
    if (existingReaction) {
      // Remove existing reaction
      message.reactions = message.reactions.filter(
        reaction => !(reaction.userId.toString() === req.user._id.toString() && reaction.emoji === emoji)
      );
      await message.save();
      
      console.log('🗑️ Removed reaction:', { messageId, emoji, userId: req.user._id });
      
      // Notify other users via socket
      const io = req.app.get('io');
      const roomName = `chat_${message.sender}_${message.receiver}`;
      io.to(roomName).emit('reaction_removed', {
        messageId,
        emoji,
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`
      });
      
      return res.json({ message: 'Reaction removed', reactions: message.reactions });
    } else {
      // Add new reaction
      const newReaction = {
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        emoji: emoji
      };
      
      message.reactions.push(newReaction);
      await message.save();
      
      console.log('✅ Added reaction:', { messageId, emoji, userId: req.user._id });
      
      // Notify other users via socket
      const io = req.app.get('io');
      const roomName = `chat_${message.sender}_${message.receiver}`;
      io.to(roomName).emit('reaction_added', {
        messageId,
        reaction: newReaction
      });
      
      return res.json({ message: 'Reaction added', reactions: message.reactions });
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
});

export default router; 