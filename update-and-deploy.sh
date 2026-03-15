#!/bin/bash
# Update and deploy AI News Blog
# Usage: ./update-and-deploy.sh

# Load NVM
source ~/.nvm/nvm.sh

# Change to project directory
cd "$(dirname "$0")"

echo "🚀 Starting AI News Blog update and deployment..."
echo ""

# Step 1: Fetch RSS and generate blog posts
echo "📡 Step 1: Fetching RSS and generating blog posts..."
npm run update

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch and generate blog posts"
    exit 1
fi

echo ""

# Step 2: Build the site
echo "🔨 Step 2: Building the site..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build site"
    exit 1
fi

echo ""

# Step 3: Deploy to Cloudflare Pages
echo "🌎 Step 3: Deploying to Cloudflare Pages..."
npx wrangler@latest pages deploy dist --project-name=ai-news-blog --commit-dirty=true

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy"
    exit 1
fi

echo ""
echo "✅ AI News Blog updated and deployed successfully!"
echo "🌐 URL: https://ai-news-blog-clw.pages.dev"
