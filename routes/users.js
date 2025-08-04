import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get all users (for discovery) - excluding current user
router.get('/discover', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = {
      _id: { $ne: currentUserId },
      isPrivate: false
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email avatar bio isOnline lastSeen followers following isPrivate allowFriendRequests createdAt')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Get current user to check friend status
    const currentUser = await User.findById(currentUserId);
    
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject();
      
      // Check if current user has received a request from this user
      const hasReceivedRequest = currentUser ? currentUser.hasFriendRequest(user._id) : false;
      
      // Check if current user has sent a request to this user
      // Ensure friendRequests array exists
      const friendRequests = user.friendRequests || [];
      const hasSentRequest = friendRequests.some(request => 
        request.from.equals(currentUserId) && request.status === 'pending'
      );
      
      // Check if they are friends
      const isFriends = currentUser ? currentUser.isFriendsWith(user._id) : false;
      
      return {
        ...userObj,
        isFriends,
        hasSentRequest,
        hasReceivedRequest,
        canSendRequest: user.allowFriendRequests && !isFriends && !hasSentRequest && !hasReceivedRequest
      };
    }));

    const total = await User.countDocuments(query);

    res.json({
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user profile by ID
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId);
    
    // Check if current user has received a request from this user
    const hasReceivedRequest = currentUser ? currentUser.hasFriendRequest(userId) : false;
    
    // Check if current user has sent a request to this user
    // Ensure friendRequests array exists
    const friendRequests = user.friendRequests || [];
    const hasSentRequest = friendRequests.some(request => 
      request.from.equals(currentUserId) && request.status === 'pending'
    );
    
    // Check if they are friends
    const isFriends = currentUser ? currentUser.isFriendsWith(userId) : false;

    const profile = {
      ...user.getPublicProfile(),
      isFriends,
      hasSentRequest,
      hasReceivedRequest,
      canSendRequest: user.allowFriendRequests && !isFriends && !hasSentRequest && !hasReceivedRequest
    };

    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Send friend request
router.post('/friend-request/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!targetUser.allowFriendRequests) {
      return res.status(400).json({ message: 'This user does not accept friend requests' });
    }

    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    
    // Check if already friends
    if (currentUser.isFriendsWith(userId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if request already exists (sent by current user)
    const friendRequests = targetUser.friendRequests || [];
    const existingRequest = friendRequests.find(request => 
      request.from.equals(currentUserId) && request.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if current user has received a request from target user
    const currentUserFriendRequests = currentUser.friendRequests || [];
    const receivedRequest = currentUserFriendRequests.find(request => 
      request.from.equals(userId) && request.status === 'pending'
    );
    
    if (receivedRequest) {
      return res.status(400).json({ message: 'This user has already sent you a friend request' });
    }

    // Add friend request
    targetUser.friendRequests.push({
      from: currentUserId,
      status: 'pending'
    });

    await targetUser.save();

    // Create notification for the recipient
    try {
      await Notification.createFriendRequestNotification(currentUserId, userId);
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/friend-request/:userId/accept', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const requestingUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!requestingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and update the friend request
    const currentUserFriendRequests = currentUser.friendRequests || [];
    const request = currentUserFriendRequests.find(
      req => req.from.equals(userId) && req.status === 'pending'
    );

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = 'accepted';

    // Add to followers/following (mutual friendship)
    if (!currentUser.followers.includes(userId)) {
      currentUser.followers.push(userId);
    }
    if (!currentUser.following.includes(userId)) {
      currentUser.following.push(userId);
    }
    
    if (!requestingUser.followers.includes(currentUserId)) {
      requestingUser.followers.push(currentUserId);
    }
    if (!requestingUser.following.includes(currentUserId)) {
      requestingUser.following.push(currentUserId);
    }

    await currentUser.save();
    await requestingUser.save();

    // Create notification for the sender
    try {
      await Notification.createFriendRequestAcceptedNotification(userId, currentUserId);
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Failed to accept friend request' });
  }
});

// Reject friend request
router.post('/friend-request/:userId/reject', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const currentUserFriendRequests = currentUser.friendRequests || [];
    const request = currentUserFriendRequests.find(
      req => req.from.equals(userId) && req.status === 'pending'
    );

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = 'rejected';

    await currentUser.save();

    // Create notification for the sender
    try {
      await Notification.createFriendRequestRejectedNotification(userId, currentUserId);
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ message: 'Failed to reject friend request' });
  }
});

// Get friend requests
router.get('/friend-requests', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId)
      .populate('friendRequests.from', 'firstName lastName email avatar');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pendingRequests = currentUser.friendRequests.filter(
      request => request.status === 'pending'
    );

    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Failed to fetch friend requests' });
  }
});

// Get friends list
router.get('/friends', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId)
      .populate('followers', 'firstName lastName email avatar isOnline lastSeen');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure followers and following arrays exist
    const followers = currentUser.followers || [];
    const following = currentUser.following || [];

    // Find mutual friends (users who are both followers and following)
    const friends = followers.filter(friend => 
      following.some(followingId => followingId.equals(friend._id))
    );

    res.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Failed to fetch friends' });
  }
});

// Update user profile
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('isPrivate').optional().isBoolean(),
  body('allowFriendRequests').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUserId = req.user._id;
    const user = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { firstName, lastName, bio, isPrivate, allowFriendRequests } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (allowFriendRequests !== undefined) user.allowFriendRequests = allowFriendRequests;

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Get all users (existing endpoint - keeping for compatibility)
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('firstName lastName email avatar isOnline lastSeen')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID (existing endpoint - keeping for compatibility)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

export default router; 