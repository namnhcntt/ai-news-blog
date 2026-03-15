import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const articlesFile = path.join(dataDir, 'articles.json');
const contentDir = path.join(__dirname, '../src/content/blog');

/**
 * Create content/blog directory if it doesn't exist
 */
if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}

/**
 * Generate slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/**
 * Extract summary from content
 */
function extractSummary(contentSnippet, maxLength = 200) {
  if (!contentSnippet) return '';
  const summary = contentSnippet
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();

  return summary.length > maxLength
    ? summary.slice(0, maxLength) + '...'
    : summary;
}

/**
 * Create markdown frontmatter
 */
function createFrontmatter(article) {
  const pubDate = article.pubDateObj || new Date();
  const formattedDate = format(pubDate, 'yyyy-MM-dd');

  return `---
title: "${article.title.replace(/"/g, '\\"')}"
description: "${extractSummary(article.contentSnippet, 150).replace(/"/g, '\\"')}"
pubDate: ${formattedDate}
tags: [${article.category.toLowerCase()}, ${article.source.toLowerCase().replace(/\s/g, '-')}]
source: "${article.source}"
sourceUrl: "${article.link}"
originalDate: "${article.pubDate}"
score: ${article.score}
---

`;
}

/**
 * Generate markdown content
 */
function generateMarkdownContent(article) {
  const frontmatter = createFrontmatter(article);

  let content = frontmatter;

  // Add source link
  content += `\n> **Source:** [${article.source}](${article.link})\n`;
  content += `> **Published:** ${new Date(article.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

  // Add article content
  if (article.contentSnippet) {
    content += `## Summary\n\n${article.contentSnippet}\n\n`;
  }

  if (article.content && article.content !== article.contentSnippet) {
    content += `## Content\n\n${article.content}\n\n`;
  }

  // Add read more link
  content += `\n---\n\n[Read full article on ${article.source}](${article.link})\n`;

  return content;
}

/**
 * Check if post already exists
 */
function postExists(slug) {
  const postPath = path.join(contentDir, `${slug}.md`);
  return fs.existsSync(postPath);
}

/**
 * Main function
 */
async function main() {
  console.log('📝 Starting blog post generation...\n');

  // Load articles
  if (!fs.existsSync(articlesFile)) {
    console.error('❌ No articles found. Run fetch-rss.js first!');
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(articlesFile, 'utf-8'));
  console.log(`📊 Loaded ${articles.length} articles\n`);

  // Filter: only generate posts for high-quality articles (score >= 5)
  const highQualityArticles = articles.filter(a => a.score >= 5);
  console.log(`✨ High-quality articles (score >= 5): ${highQualityArticles.length}\n`);

  // Generate posts
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const article of highQualityArticles) {
    const slug = generateSlug(article.title);
    const postPath = path.join(contentDir, `${slug}.md`);
    const markdown = generateMarkdownContent(article);

    if (fs.existsSync(postPath)) {
      // Check if we should update (if score is higher or article is newer)
      const existingContent = fs.readFileSync(postPath, 'utf-8');
      const scoreMatch = existingContent.match(/score: (\d+)/);
      const existingScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      if (article.score > existingScore) {
        console.log(`🔄 Updating: ${article.title}`);
        fs.writeFileSync(postPath, markdown);
        updated++;
      } else {
        console.log(`⏭️  Skipping: ${article.title} (already exists)`);
        skipped++;
      }
    } else {
      console.log(`✅ Creating: ${article.title}`);
      fs.writeFileSync(postPath, markdown);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📁 Posts in: ${contentDir}`);
}

main().catch(console.error);
