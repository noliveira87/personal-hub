#!/bin/bash
set -e

echo "🚀 Starting deployment..."
echo "📦 Pulling latest changes..."
git pull

echo "🔨 Building application..."
npm run build

echo "♻️  Restarting PM2 processes..."
pm2 restart all

echo "✅ Deployment completed successfully!"
