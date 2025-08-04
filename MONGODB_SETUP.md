# MongoDB Atlas Setup Guide

## 🚀 Quick Setup

Your backend needs a MongoDB database. Since Railway doesn't provide MongoDB, you need to set up MongoDB Atlas (free tier).

## 📋 Step-by-Step Setup

### 1. Create MongoDB Atlas Account
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose "Free" tier (M0)

### 2. Create a Cluster
1. Click "Build a Database"
2. Choose "FREE" tier (M0)
3. Select your preferred cloud provider (AWS/Google Cloud/Azure)
4. Choose a region close to your users
5. Click "Create"

### 3. Set Up Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Set privileges to "Read and write to any database"
6. Click "Add User"

### 4. Set Up Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 5. Get Connection String
1. Go back to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string

### 6. Update Railway Environment Variables
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add this variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string

## 🔗 Connection String Format

Replace `<password>` with your actual password:
```
mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority
```

## ✅ Verification

After setting up:
1. **Redeploy** your Railway service
2. **Check logs** for "✅ Connected to MongoDB successfully"
3. **Test the health endpoint**: `https://web-production-d5c5.up.railway.app/api/health`

## 🐛 Troubleshooting

### Common Issues:
1. **Connection timeout**: Check if IP whitelist includes Railway's IPs
2. **Authentication failed**: Verify username/password
3. **Network access**: Make sure "Allow Access from Anywhere" is enabled

### Debug Steps:
1. Check Railway logs for MongoDB connection errors
2. Verify environment variables are set correctly
3. Test connection string locally first

## 🔒 Security Notes

- **Free tier**: Limited to 512MB storage
- **Network access**: Consider restricting IPs for production
- **Database user**: Use strong passwords
- **Connection string**: Keep it secure, don't commit to Git

## 📊 Monitoring

MongoDB Atlas provides:
- **Real-time monitoring** of your database
- **Performance metrics**
- **Connection analytics**
- **Storage usage**

Your chat application will work perfectly with MongoDB Atlas! 🎉 