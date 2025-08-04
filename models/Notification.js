import { DataTypes } from 'sequelize';

const Notification = (sequelize) => {
  const NotificationModel = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('message', 'friend_request', 'call', 'system'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        fields: ['recipientId', 'isRead']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['type']
      }
    ]
  });

  // Instance method to mark as read
  NotificationModel.prototype.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  };

  // Instance method to get notification text
  NotificationModel.prototype.getNotificationText = function() {
    switch (this.type) {
      case 'message':
        return `New message from ${this.sender?.firstName || 'Someone'}`;
      case 'friend_request':
        return `Friend request from ${this.sender?.firstName || 'Someone'}`;
      case 'call':
        return `Incoming call from ${this.sender?.firstName || 'Someone'}`;
      case 'system':
        return this.message;
      default:
        return this.message;
    }
  };

  return NotificationModel;
};

export default Notification; 