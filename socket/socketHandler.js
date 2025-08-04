import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';

export const handleSocketConnection = async (socket, io) => {
  try {
    // Authenticate socket connection
    const token = socket.handshake.auth.token;
    
    if (!token) {
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      socket.disconnect();
      return;
    }

    // Store user info in socket
    socket.userId = user._id;
    socket.user = user;

    // Update user's online status
    user.isOnline = true;
    user.socketId = socket.id;
    user.lastSeen = new Date();
    await user.save();

    // Join user to their personal room
    socket.join(`user_${user._id}`);

    // Emit user online status to all users
    io.emit('user_online', {
      userId: user._id,
      isOnline: true,
      lastSeen: user.lastSeen
    });

    console.log(`👤 User ${user.firstName} ${user.lastName} connected`);

    // Handle private messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, messageType = 'text', audioBlob } = data;

        if (!content || !receiverId) {
          socket.emit('error', { message: 'Message content and receiver are required' });
          return;
        }

        // Handle audio messages
        let fileUrl = null;
        if (messageType === 'audio' && audioBlob) {
          // Convert audio blob to base64
          const base64Audio = audioBlob;
          fileUrl = `data:audio/webm;base64,${base64Audio}`;
        }

        // Create message in database
        const message = new Message({
          sender: user._id,
          receiver: receiverId,
          content,
          messageType,
          fileUrl
        });

        await message.save();

        // Populate sender info
        await message.populate('sender', 'firstName lastName avatar');

        // Send to receiver if online
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.socketId) {
          io.to(`user_${receiverId}`).emit('new_message', {
            message: message.toJSON(),
            sender: user.toJSON()
          });
          
          // Mark message as read immediately if receiver is online (except for audio messages)
          if (messageType !== 'audio') {
            message.isRead = true;
            message.readAt = new Date();
            await message.save();
            
            // Notify sender that message was read
            socket.emit('message_read', {
              messageId: message._id,
              readBy: receiver._id,
              readAt: message.readAt
            });
          }
        }

        // Send confirmation to sender
        socket.emit('message_sent', {
          message: message.toJSON(),
          receiver: receiver?.toJSON()
        });

        if (messageType === 'audio') {
          console.log(`🎵 Audio message sent from ${user.firstName} to ${receiver?.firstName}`);
        } else {
          console.log(`💬 Message sent from ${user.firstName} to ${receiver?.firstName}`);
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', async (data) => {
      const { receiverId } = data;
      console.log(`⌨️ ${user.firstName} started typing to user ${receiverId}`);
      
      const receiver = await User.findById(receiverId);
      
      if (receiver && receiver.socketId) {
        console.log(`📤 Sending typing indicator to ${receiver.firstName}`);
        io.to(`user_${receiverId}`).emit('user_typing', {
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`
        });
      } else {
        console.log(`❌ Receiver ${receiverId} not found or not online`);
      }
    });

    socket.on('typing_stop', async (data) => {
      const { receiverId } = data;
      console.log(`🛑 ${user.firstName} stopped typing to user ${receiverId}`);
      
      const receiver = await User.findById(receiverId);
      
      if (receiver && receiver.socketId) {
        console.log(`📤 Sending stop typing indicator to ${receiver.firstName}`);
        io.to(`user_${receiverId}`).emit('user_stopped_typing', {
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`
        });
      } else {
        console.log(`❌ Receiver ${receiverId} not found or not online`);
      }
    });

    // Handle message read receipts
    socket.on('mark_as_read', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === user._id.toString() && !message.isRead) {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();

          console.log(`Message ${messageId} marked as read`);

          // Notify sender that message was read
          const sender = await User.findById(message.sender);
          if (sender && sender.socketId) {
            console.log(`Notifying sender ${sender.firstName} that message was read`);
            io.to(`user_${message.sender}`).emit('message_read', {
              messageId: message._id,
              readBy: user._id,
              readAt: message.readAt
            });
          }
        } else if (message && message.isRead) {
          console.log(`Message ${messageId} already marked as read, skipping notification`);
        } else {
          console.log(`Message ${messageId} not found or user not authorized to mark as read`);
        }
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    // Handle user status updates
    socket.on('update_status', async (data) => {
      try {
        const { status } = data;
        user.status = status;
        await user.save();

        io.emit('user_status_updated', {
          userId: user._id,
          status: user.status
        });
      } catch (error) {
        console.error('Update status error:', error);
      }
    });

    // Handle audio call requests
    socket.on('audio_call_request', async (data) => {
      try {
        const { receiverId, offer, callId } = data;
        console.log(`📞 Audio call request from ${user.firstName} to user ${receiverId}`);

        const receiver = await User.findById(receiverId);
        if (receiver && receiver.socketId) {
          io.to(`user_${receiverId}`).emit('audio_call_incoming', {
            callerId: user._id,
            callerName: `${user.firstName} ${user.lastName}`,
            callId: callId,
            offer: offer
          });
          console.log(`📞 Call request sent to ${receiver.firstName}`);
        } else {
          console.log(`📞 Receiver ${receiverId} not found or not online`);
          socket.emit('audio_call_missed', { callId: callId });
        }
      } catch (error) {
        console.error('Audio call request error:', error);
      }
    });

    // Handle audio call answers
    socket.on('audio_call_answer', async (data) => {
      try {
        const { callerId, answer, callId } = data;
        console.log(`📞 Audio call answered by ${user.firstName}`);

        const caller = await User.findById(callerId);
        if (caller && caller.socketId) {
          io.to(`user_${callerId}`).emit('audio_call_answered', {
            answer: answer,
            callId: callId
          });
          console.log(`📞 Call answer sent to ${caller.firstName}`);
        }
      } catch (error) {
        console.error('Audio call answer error:', error);
      }
    });

    // Handle audio call rejections
    socket.on('audio_call_reject', async (data) => {
      try {
        const { callId, callerId } = data;
        console.log(`📞 Audio call rejected by ${user.firstName}`);

        const caller = await User.findById(callerId);
        if (caller && caller.socketId) {
          io.to(`user_${callerId}`).emit('audio_call_rejected', {
            callId: callId
          });
          console.log(`📞 Call rejection sent to ${caller.firstName}`);
        }
      } catch (error) {
        console.error('Audio call reject error:', error);
      }
    });

    // Handle audio call endings
    socket.on('audio_call_end', async (data) => {
      try {
        const { callId, receiverId } = data;
        console.log(`📞 Audio call ended by ${user.firstName}`);

        const receiver = await User.findById(receiverId);
        if (receiver && receiver.socketId) {
          io.to(`user_${receiverId}`).emit('audio_call_ended', {
            callId: callId
          });
          console.log(`📞 Call end notification sent to ${receiver.firstName}`);
        }
      } catch (error) {
        console.error('Audio call end error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        // Update user's offline status
        user.isOnline = false;
        user.socketId = null;
        user.lastSeen = new Date();
        await user.save();

        // Emit user offline status
        io.emit('user_offline', {
          userId: user._id,
          isOnline: false,
          lastSeen: user.lastSeen
        });

        console.log(`👤 User ${user.firstName} ${user.lastName} disconnected`);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });

  } catch (error) {
    console.error('Socket connection error:', error);
    socket.emit('error', { message: 'Authentication failed' });
    socket.disconnect();
  }
}; 