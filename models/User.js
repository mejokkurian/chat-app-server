import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'away', 'busy', 'offline'],
    default: 'active'
  },
  socketId: {
    type: String,
    default: null
  },
  // Friend request system
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Privacy settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowFriendRequests: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    status: this.status,
    followers: this.followers.length,
    following: this.following.length,
    isPrivate: this.isPrivate,
    allowFriendRequests: this.allowFriendRequests,
    createdAt: this.createdAt
  };
};

// Check if user is friends with another user
userSchema.methods.isFriendsWith = function(userId) {
  const followers = this.followers || [];
  const following = this.following || [];
  return following.includes(userId) && followers.includes(userId);
};

// Check if friend request exists (received from another user)
userSchema.methods.hasFriendRequest = function(fromUserId) {
  const friendRequests = this.friendRequests || [];
  return friendRequests.some(request => 
    request.from.equals(fromUserId) && request.status === 'pending'
  );
};

// Check if user has sent friend request to another user
userSchema.methods.hasSentFriendRequest = function(toUserId) {
  // This method should check if the current user has sent a request to toUserId
  // We need to check the target user's friendRequests array
  // This is a limitation of the current schema - we should track sent requests
  return false; // This will be handled in the route logic
};

const User = mongoose.model('User', userSchema);

export default User; 