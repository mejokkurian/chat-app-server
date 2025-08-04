# PostgreSQL Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Add PostgreSQL to Railway
1. Go to your Railway project dashboard
2. Click "New Service" → "Database" → "PostgreSQL"
3. Railway will create a free PostgreSQL database

### Step 2: Get Connection String
1. Click on your new PostgreSQL service
2. Go to "Connect" tab
3. Copy the `DATABASE_URL` connection string

### Step 3: Add to Main Service
1. Go back to your main service (chat-server)
2. Go to "Variables" tab
3. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Copy from PostgreSQL service

### Step 4: Deploy
1. Railway will automatically redeploy
2. Check logs for "✅ Connected to PostgreSQL successfully"
3. Test: `https://web-production-d5c5.up.railway.app/api/health`

## ✅ Success Indicators

- ✅ "Connected to PostgreSQL successfully" in logs
- ✅ "Database tables synchronized" in logs
- ✅ Health endpoint shows "Connected" for database
- ✅ Signup/login works without errors

## 🔗 Connection String Format

Your connection string will look like:
```
postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway
```

## 🐛 Troubleshooting

### Common Issues:
1. **Connection timeout**: Check if DATABASE_URL is set correctly
2. **Table creation errors**: Check Railway logs for detailed errors
3. **Authentication failed**: Verify the connection string

### Debug Steps:
1. Check Railway logs for PostgreSQL connection errors
2. Verify DATABASE_URL environment variable is set
3. Ensure PostgreSQL service is running

## 🆓 Free Tier Benefits

Railway PostgreSQL includes:
- **Free tier**: 1GB storage
- **Automatic backups**
- **Connection pooling**
- **SSL encryption**
- **No setup required**

Your chat application will work perfectly with Railway PostgreSQL! 🎉 