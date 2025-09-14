#!/bin/bash

# Deploy script for Infflow Cloudflare Worker
echo "🚀 Starting Infflow deployment..."

# Navigate to cf-worker directory
cd cf-worker

# Build the frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy the worker
echo "☁️ Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "✅ Deployment completed at $(date)"
