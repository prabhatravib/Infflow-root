@echo off
REM Deploy script for Infflow Cloudflare Worker
echo 🚀 Starting Infflow deployment...

REM Navigate to cf-worker directory
cd cf-worker

REM Build the frontend
echo 📦 Building frontend...
cd frontend
call npm install
call npm run build
cd ..

REM Deploy the worker
echo ☁️ Deploying to Cloudflare Workers...
call npx wrangler deploy

echo ✅ Deployment complete!
