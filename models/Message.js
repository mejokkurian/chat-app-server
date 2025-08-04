import { DataTypes } from 'sequelize';

const Message = (sequelize) => {
  const MessageModel = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    messageType: {
      type: DataTypes.ENUM('text', 'audio', 'video', 'image', 'file'),
      defaultValue: 'text'
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER, // For audio/video messages in seconds
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedForEveryone: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    replyTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    reactions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    indexes: [
      {
        fields: ['senderId', 'receiverId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['isRead']
      }
    ]
  });

  // Instance method to get message preview
  MessageModel.prototype.getPreview = function() {
    if (this.messageType === 'text') {
      return this.content.length > 50 ? this.content.substring(0, 50) + '...' : this.content;
    } else if (this.messageType === 'audio') {
      return '🎵 Audio message';
    } else if (this.messageType === 'video') {
      return '🎥 Video message';
    } else if (this.messageType === 'image') {
      return '🖼️ Image';
    } else if (this.messageType === 'file') {
      return `📎 ${this.fileName || 'File'}`;
    }
    return 'Message';
  };

  // Instance method to mark as read
  MessageModel.prototype.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  };

  // Instance method to soft delete
  MessageModel.prototype.softDelete = function(forEveryone = false) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (forEveryone) {
      this.deletedForEveryone = true;
    }
    return this.save();
  };

  return MessageModel;
};

export default Message; 