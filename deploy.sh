#!/bin/bash
# Deploy to Cloudflare Pages

# Load NVM
source ~/.nvm/nvm.sh

# Build project
npm run build

# Deploy to Cloudflare Pages
npx wrangler@latest pages deploy dist --project-name=ai-news-blog --commit-dirty=true

echo "✅ Deploy complete! URL: https://ai-news-blog-clw.pages.dev"
