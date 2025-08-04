# Chat Server - Node.js Backend

A real-time chat application backend built with Node.js, Express, Socket.IO, and MongoDB.

## 🚀 Features

- **Real-time Messaging** with Socket.IO
- **User Authentication** with JWT
- **User Management** (online/offline status, profiles)
- **Message History** with MongoDB
- **Read Receipts** and typing indicators
- **File Upload** support
- **Search Users** functionality
- **Rate Limiting** and security features

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chat-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your-super-secret-jwt-key
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env
   ```

5. **Run the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (for chat list)
- `GET /api/users/:userId` - Get specific user profile
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users/search/:query` - Search users

### Messages
- `GET /api/messages/conversation/:userId` - Get conversation with user
- `GET /api/messages/conversations` - Get recent conversations
- `DELETE /api/messages/:messageId` - Delete message
- `PUT /api/messages/:messageId/read` - Mark message as read
- `GET /api/messages/unread/count` - Get unread count

## 🔌 Socket.IO Events

### Client to Server
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_as_read` - Mark message as read
- `update_status` - Update user status

### Server to Client
- `new_message` - Receive new message
- `message_sent` - Confirm message sent
- `message_read` - Message read receipt
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `user_online` - User came online
- `user_offline` - User went offline
- `user_status_updated` - User status changed

## 🗄️ Database Models

### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  avatar: String,
  isOnline: Boolean,
  lastSeen: Date,
  status: String (active/inactive/banned),
  socketId: String
}
```

### Message Model
```javascript
{
  sender: ObjectId (ref: User),
  receiver: ObjectId (ref: User),
  content: String,
  messageType: String (text/image/file/audio/video),
  fileUrl: String,
  isRead: Boolean,
  readAt: Date,
  isDeleted: Boolean,
  deletedAt: Date
}
```

## 🔒 Security Features

- **JWT Authentication** for API routes
- **Socket.IO Authentication** for real-time connections
- **Password Hashing** with bcrypt
- **Rate Limiting** to prevent abuse
- **CORS** configuration
- **Helmet** for security headers
- **Input Validation** with express-validator

## 🚀 Deployment

### Environment Variables
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=https://your-frontend-domain.com
```

### Production Commands
```bash
npm install --production
npm start
```

## 📊 Health Check

Visit `http://localhost:5000/api/health` to check if the server is running.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details. 