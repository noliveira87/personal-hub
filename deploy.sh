#!/bin/bash
set -e

echo "🚀 Starting deployment..."
echo "📦 Pulling latest changes..."
git pull

echo "🔨 Building application..."
npm run build

echo "♻️  Recreating PM2 hub process with SPA fallback..."
pm2 delete hub || true
pm2 serve packages/hub/dist 8081 --name hub --spa
pm2 save

echo "✅ Deployment completed successfully!"
