# 🔧 How to Get Your Upstash Redis URL

## ⚠️ IMPORTANT: You Need the REDIS URL, Not REST URL!

Upstash provides **TWO different connection methods**:
1. **REST API** (for HTTP requests) - ❌ This won't work with our app
2. **Redis Connection** (for TCP/Redis protocol) - ✅ This is what we need

---

## 📋 Step-by-Step: Get Your Redis URL

### 1. Go to Upstash Dashboard
Open: https://console.upstash.com/

### 2. Click Your Database
Click on: `new-heron-28759` (your database)

### 3. Find the Redis Connection Section
Look for a section that says **"Redis Connection"** or **"Connect"**

You'll see multiple tabs or options:
- **REST API** ← ❌ Not this one!
- **Redis** or **Connection** ← ✅ This is what you need!

### 4. Copy the Correct URL Format

Look for a URL that looks like ONE of these:

**Option A: Standard Redis URL**
```
redis://default:YOUR_PASSWORD@your-host.upstash.io:6379
```

**Option B: Rediss URL (with SSL)**
```
rediss://default:YOUR_PASSWORD@your-host.upstash.io:6379
```

**Option C: Or you might see these separately:**
- **Endpoint:** `your-host.upstash.io`
- **Port:** `6379`
- **Password:** `YOUR_LONG_PASSWORD`

Then construct the URL:
```
redis://default:YOUR_PASSWORD@your-host.upstash.io:6379
```

---

## 🎯 What You Currently Have (WRONG Format)

You gave me:
```
UPSTASH_REDIS_REST_URL="https://new-heron-28759.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXBXAAIncDJkYjQ4OWI0MjJkZjk0NDlmOWYxZGM0YmNhYzViZTQwZnAyMjg3NTk"
```

This is the **REST API** format (notice `https://`), which is for HTTP requests, not Redis connections.

---

## ✅ What You Need (CORRECT Format)

Look for something like:
```
redis://default:AXBXAAIncDE...VERY_LONG_PASSWORD...@new-heron-28759.upstash.io:6379
```

Key differences:
- ✅ Starts with `redis://` or `rediss://` (NOT `https://`)
- ✅ Includes `default:PASSWORD@` before the host
- ✅ Ends with `:6379` (the Redis port)
- ✅ Password is much longer (usually 50+ characters)

---

## 📸 Visual Guide

In your Upstash dashboard, you should see tabs like:

```
┌─────────────────────────────────────────┐
│  REST API  │  Redis  │  CLI  │  ...     │  ← Click "Redis" tab
└─────────────────────────────────────────┘

Redis Connection String:
┌─────────────────────────────────────────┐
│ redis://default:AXBXAAIncDE1234567...   │  ← Copy this!
│ ...@new-heron-28759.upstash.io:6379     │
└─────────────────────────────────────────┘
```

---

## 🧪 Once You Have the Correct URL

### Test Locally:

1. **Create `.env` file** in your project root:
```bash
REDIS_URL=redis://default:YOUR_REAL_PASSWORD@new-heron-28759.upstash.io:6379
```

2. **Update test file:**
```python
# test_redis_connection.py
import os
from dotenv import load_dotenv

load_dotenv()  # Load .env file

# Rest of the test code...
```

3. **Run test:**
```bash
pip install python-dotenv
python test_redis_connection.py
```

### Add to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name:** `REDIS_URL`
   - **Value:** `redis://default:YOUR_REAL_PASSWORD@new-heron-28759.upstash.io:6379`
3. Redeploy

---

## ❓ Still Can't Find It?

**Screenshot or copy EXACTLY what you see** in the Upstash dashboard under your database's connection details. I'll help you identify the correct URL!

Look for sections labeled:
- "Redis Connection"
- "Connection String"
- "Redis URL"
- "Endpoint"

**DO NOT use anything with `https://` or `REST`!**
