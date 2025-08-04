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

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

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

// Rate limiting with proper configuration for Railway
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true // Trust the proxy for Railway
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with better error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';
    console.log('🔗 Connecting to MongoDB...');
    console.log('📝 Using URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide password
    
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI environment variable not set!');
      console.log('📋 Setup instructions:');
      console.log('1. Go to Railway dashboard → Variables');
      console.log('2. Add MONGODB_URI with your MongoDB Atlas connection string');
      console.log('3. Format: mongodb+srv://username:password@cluster.mongodb.net/chat-app');
      console.log('4. Redeploy your service');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('💡 Make sure to set MONGODB_URI environment variable in Railway');
    console.log('💡 You can use MongoDB Atlas (free tier) for cloud database');
    console.log('📖 See MONGODB_SETUP.md for detailed instructions');
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

// Connect to database
connectDB();

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
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
}); 