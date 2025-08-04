import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['friend_request', 'friend_request_accepted', 'friend_request_rejected', 'message', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

// Get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Mark notifications as read
notificationSchema.statics.markAsRead = async function(userId, notificationIds = null) {
  const query = {
    recipient: userId,
    isRead: false,
    isDeleted: false
  };
  
  if (notificationIds) {
    query._id = { $in: notificationIds };
  }
  
  return this.updateMany(query, { isRead: true });
};

// Create friend request notification
notificationSchema.statics.createFriendRequestNotification = async function(fromUserId, toUserId) {
  const fromUser = await mongoose.model('User').findById(fromUserId).select('firstName lastName');
  const toUser = await mongoose.model('User').findById(toUserId).select('firstName lastName');
  
  if (!fromUser || !toUser) {
    throw new Error('User not found');
  }
  
  return this.create({
    recipient: toUserId,
    sender: fromUserId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${fromUser.firstName} ${fromUser.lastName} sent you a friend request`,
    data: {
      fromUser: {
        _id: fromUser._id,
        firstName: fromUser.firstName,
        lastName: fromUser.lastName
      }
    }
  });
};

// Create friend request accepted notification
notificationSchema.statics.createFriendRequestAcceptedNotification = async function(fromUserId, toUserId) {
  const fromUser = await mongoose.model('User').findById(fromUserId).select('firstName lastName');
  const toUser = await mongoose.model('User').findById(toUserId).select('firstName lastName');
  
  if (!fromUser || !toUser) {
    throw new Error('User not found');
  }
  
  return this.create({
    recipient: fromUserId,
    sender: toUserId,
    type: 'friend_request_accepted',
    title: 'Friend Request Accepted',
    message: `${toUser.firstName} ${toUser.lastName} accepted your friend request`,
    data: {
      toUser: {
        _id: toUser._id,
        firstName: toUser.firstName,
        lastName: toUser.lastName
      }
    }
  });
};

// Create friend request rejected notification
notificationSchema.statics.createFriendRequestRejectedNotification = async function(fromUserId, toUserId) {
  const fromUser = await mongoose.model('User').findById(fromUserId).select('firstName lastName');
  const toUser = await mongoose.model('User').findById(toUserId).select('firstName lastName');
  
  if (!fromUser || !toUser) {
    throw new Error('User not found');
  }
  
  return this.create({
    recipient: fromUserId,
    sender: toUserId,
    type: 'friend_request_rejected',
    title: 'Friend Request Rejected',
    message: `${toUser.firstName} ${toUser.lastName} rejected your friend request`,
    data: {
      toUser: {
        _id: toUser._id,
        firstName: toUser.firstName,
        lastName: toUser.lastName
      }
    }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification; 