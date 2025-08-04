# Quick MongoDB Atlas Setup

## 🚀 5-Minute Setup

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Click "Try Free" → Create account
3. Choose "FREE" tier (M0)

### Step 2: Create Database
1. Click "Build a Database"
2. Choose "FREE" tier
3. Select AWS/Google Cloud/Azure (any)
4. Choose region (any)
5. Click "Create"

### Step 3: Set Up Access
1. **Database Access** (left sidebar):
   - Click "Add New Database User"
   - Username: `chatadmin`
   - Password: `YourStrongPassword123!`
   - Privileges: "Read and write to any database"
   - Click "Add User"

2. **Network Access** (left sidebar):
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

### Step 4: Get Connection String
1. Go back to "Database" (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string

### Step 5: Add to Railway
1. Go to [railway.app](https://railway.app)
2. Open your chat-server project
3. Go to "Variables" tab
4. Add new variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your connection string (replace `<password>` with your password)

### Step 6: Test
1. Railway will auto-redeploy
2. Check logs for "✅ Connected to MongoDB successfully"
3. Test: `https://web-production-d5c5.up.railway.app/api/health`

## 🔗 Connection String Format

Replace `<password>` with your actual password:
```
mongodb+srv://chatadmin:<password>@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority
```

## ✅ Success Indicators

- ✅ "Connected to MongoDB successfully" in logs
- ✅ Health endpoint shows "Connected" for database
- ✅ Signup/login works without errors

## 🆘 Need Help?

If you're still getting connection errors:
1. **Check Railway logs** for detailed error messages
2. **Verify password** in connection string
3. **Ensure Network Access** allows 0.0.0.0/0
4. **Wait 2-3 minutes** for Railway to redeploy

Your chat app will work perfectly once MongoDB is connected! 🎉 