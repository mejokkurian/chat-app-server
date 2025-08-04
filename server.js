import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';

// Import socket handlers
import { handleSocketConnection } from './socket/socketHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration
const allowedOrigins = [
  // Development
  "http://localhost:3000",
  "http://localhost:3001", 
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:5173",
  // Production - Vercel domains
  "https://chat-app-*.vercel.app",
  "https://*.vercel.app",
  // Add your specific Vercel domain here once deployed
  "https://chat-app-mejokkurian.vercel.app",
  "https://chat-app-git-main-mejokkurian.vercel.app"
];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for Socket.IO
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chat server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
}); 