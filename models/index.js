import User from './User.js';
import Message from './Message.js';
import Notification from './Notification.js';

const initializeModels = (sequelize) => {
  // Initialize models
  const UserModel = User(sequelize);
  const MessageModel = Message(sequelize);
  const NotificationModel = Notification(sequelize);

  // Define associations
  UserModel.hasMany(MessageModel, { 
    foreignKey: 'senderId', 
    as: 'sentMessages' 
  });
  UserModel.hasMany(MessageModel, { 
    foreignKey: 'receiverId', 
    as: 'receivedMessages' 
  });

  MessageModel.belongsTo(UserModel, { 
    foreignKey: 'senderId', 
    as: 'sender' 
  });
  MessageModel.belongsTo(UserModel, { 
    foreignKey: 'receiverId', 
    as: 'receiver' 
  });

  // Self-referencing association for reply messages
  MessageModel.belongsTo(MessageModel, { 
    foreignKey: 'replyTo', 
    as: 'replyToMessage' 
  });
  MessageModel.hasMany(MessageModel, { 
    foreignKey: 'replyTo', 
    as: 'replies' 
  });

  // Notification associations
  UserModel.hasMany(NotificationModel, { 
    foreignKey: 'recipientId', 
    as: 'receivedNotifications' 
  });
  UserModel.hasMany(NotificationModel, { 
    foreignKey: 'senderId', 
    as: 'sentNotifications' 
  });

  NotificationModel.belongsTo(UserModel, { 
    foreignKey: 'recipientId', 
    as: 'recipient' 
  });
  NotificationModel.belongsTo(UserModel, { 
    foreignKey: 'senderId', 
    as: 'sender' 
  });
  NotificationModel.belongsTo(MessageModel, { 
    foreignKey: 'messageId', 
    as: 'message' 
  });

  return {
    User: UserModel,
    Message: MessageModel,
    Notification: NotificationModel
  };
};

export default initializeModels; 