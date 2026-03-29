#!/bin/bash
set -e

LOCK_HASH_BEFORE=""
if [ -f package-lock.json ]; then
	LOCK_HASH_BEFORE=$(node -e "const fs=require('fs');const crypto=require('crypto');const data=fs.readFileSync('package-lock.json');process.stdout.write(crypto.createHash('sha256').update(data).digest('hex'));")
fi

echo "🚀 Starting deployment..."
echo "📦 Pulling latest changes..."
git pull

LOCK_HASH_AFTER=""
if [ -f package-lock.json ]; then
	LOCK_HASH_AFTER=$(node -e "const fs=require('fs');const crypto=require('crypto');const data=fs.readFileSync('package-lock.json');process.stdout.write(crypto.createHash('sha256').update(data).digest('hex'));")
fi

if [ ! -d node_modules ] || [ ! -d packages/hub/node_modules ] || [ "$LOCK_HASH_BEFORE" != "$LOCK_HASH_AFTER" ]; then
	echo "📚 Installing dependencies..."
	npm ci || npm install
else
	echo "📚 Dependencies unchanged, skipping install."
fi

echo "🩹 Ensuring native optional deps (Rollup/SWC)..."
if ! node -e "require.resolve('@rollup/rollup-linux-x64-gnu'); require.resolve('@swc/core-linux-x64-gnu')" >/dev/null 2>&1; then
	npm i @rollup/rollup-linux-x64-gnu @swc/core-linux-x64-gnu --no-save
fi

echo "🔨 Building application..."
npm run build

echo "♻️  Recreating PM2 hub process with SPA fallback..."
pm2 delete hub || true
pm2 serve packages/hub/dist 8081 --name hub --spa
pm2 save

echo "✅ Deployment completed successfully!"
