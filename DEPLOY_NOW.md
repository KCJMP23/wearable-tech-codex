# 🚀 Deploy to Railway - Quick Steps

Railway CLI is now installed! Follow these steps to complete the deployment:

## Step 1: Login to Railway

Open a new terminal and run:
```bash
railway login
```

This will open your browser. Login with:
- GitHub (recommended)
- Email
- Or create a new account

## Step 2: Navigate to Project

```bash
cd /Volumes/OWC\ Envoy\ Ultra/Projects/wearable-tech-codex-91625
```

## Step 3: Initialize Railway Project

```bash
railway init
```

When prompted:
- Choose: **"Empty Project"**
- Name it: **"wearable-tech-codex"** or your preferred name

## Step 4: Set Environment Variables

```bash
# Set required environment variables
railway variables set DATABASE_URL="your_supabase_database_url"
railway variables set NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_service_key"

# Optional but recommended
railway variables set OPENAI_API_KEY="your_openai_key"
railway variables set RAPIDAPI_KEY="your_rapidapi_key"
```

## Step 5: Deploy

```bash
railway up
```

This will:
1. Upload your code
2. Detect the railway.json configuration
3. Run the build command
4. Deploy your application

## Step 6: Get Your App URL

After deployment completes:
```bash
railway domain
```

Or generate a domain:
```bash
railway domain generate
```

## Step 7: Open Your App

```bash
railway open
```

## Monitor Deployment

Watch the logs:
```bash
railway logs
```

## Troubleshooting Commands

If you encounter issues:

```bash
# View deployment status
railway status

# View all environment variables
railway variables

# Redeploy
railway up

# View build logs
railway logs --build
```

## Expected Output

After successful deployment, you should see:
```
✅ Build successful
✅ Deploying...
✅ Deployment live at: https://your-app.railway.app
```

## Test Your Deployment

Visit these URLs (replace with your Railway domain):
1. `https://your-app.railway.app/api/health` - Should return {"status":"ok"}
2. `https://your-app.railway.app/` - Homepage
3. `https://your-app.railway.app/features` - Features page
4. `https://your-app.railway.app/pricing` - Pricing page

## Need Help?

- Railway Dashboard: https://railway.app/dashboard
- Railway Discord: https://discord.gg/railway
- Check logs: `railway logs`

---

**Your app is ready to deploy!** Just follow the steps above in your terminal.