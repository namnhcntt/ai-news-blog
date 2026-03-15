import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: ['content:encoded', 'media:content', 'image']
  }
});

// Load RSS sources
const sourcesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/rss-sources.json'), 'utf-8')
);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Fetch RSS feed from a single source
 */
async function fetchFeed(source) {
  console.log(`📡 Fetching ${source.name}...`);

  try {
    const feed = await parser.parseURL(source.url);
    console.log(`   ✅ ${feed.items.length} articles found`);

    // Transform items
    const items = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      pubDateObj: item.pubDate ? new Date(item.pubDate) : new Date(),
      contentSnippet: item.contentSnippet || '',
      content: item.content || item['content:encoded'] || '',
      guid: item.guid || item.link,
      category: source.category,
      source: source.name,
      language: source.language
    }));

    return items;
  } catch (error) {
    console.error(`   ❌ Error fetching ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Score an article based on keywords and recency
 */
function scoreArticle(article, keywords) {
  let score = 0;
  const title = article.title.toLowerCase();
  const content = (article.contentSnippet + '').toLowerCase();
  const text = title + ' ' + content;

  // Keyword matching
  for (const keyword of keywords.ai.concat(keywords.tech)) {
    if (text.includes(keyword.toLowerCase())) {
      score += 2;
    }
  }

  // Recency bonus (within last 3 days)
  const daysOld = (Date.now() - article.pubDateObj.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 1) score += 10;
  else if (daysOld < 3) score += 5;
  else if (daysOld < 7) score += 2;

  return score;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting RSS fetch...\n');

  // Fetch all sources
  let allArticles = [];
  for (const source of sourcesConfig.sources) {
    const items = await fetchFeed(source);
    allArticles = allArticles.concat(items);
  }

  console.log(`\n📊 Total articles: ${allArticles.length}`);

  // Score and filter
  const scoredArticles = allArticles.map(article => ({
    ...article,
    score: scoreArticle(article, sourcesConfig.keywords)
  }));

  // Sort by score (descending) then by date (descending)
  scoredArticles.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.pubDateObj - a.pubDateObj;
  });

  // Filter out low-score articles and old articles (> 30 days)
  const filteredArticles = scoredArticles.filter(
    article => article.score > 0 && (Date.now() - article.pubDateObj.getTime()) / (1000 * 60 * 60 * 24) < 30
  );

  console.log(`✨ High-quality articles: ${filteredArticles.length}\n`);

  // Remove duplicates (by link or title)
  const seen = new Set();
  const uniqueArticles = filteredArticles.filter(article => {
    const key = article.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`🔖 Unique articles: ${uniqueArticles.length}`);

  // Save to file
  const outputFile = path.join(dataDir, 'articles.json');
  fs.writeFileSync(outputFile, JSON.stringify(uniqueArticles, null, 2));

  console.log(`\n💾 Saved to: ${outputFile}`);

  // Print top 10 articles
  console.log('\n🏆 Top 10 Articles:');
  uniqueArticles.slice(0, 10).forEach((article, index) => {
    const daysAgo = Math.floor((Date.now() - article.pubDateObj.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`\n${index + 1}. [${article.score} pts] ${article.title}`);
    console.log(`   📰 ${article.source} | 📅 ${daysAgo}d ago | 🏷️ ${article.category}`);
    console.log(`   🔗 ${article.link}`);
  });
}

main().catch(console.error);
