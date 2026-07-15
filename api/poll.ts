// @ts-nocheck
import { postToBluesky, postToThreads } from './_lib/social.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROK_API_KEY; // Groq (fast inference), not xAI's Grok
const GITHUB_TOKEN = process.env.Github;
const CHANNEL_ID = '@IndiaWorldIntel';
const REPO = 'chokoboy6266-web/geopolitical-dashboard';
const ARTICLES_FILE = 'api/articles.json';

async function getAnalysis(title: string, source: string): Promise<{ telegramAnalysis: string; fullArticle: string }> {
  const fallbackTelegram = `Analysis: This development in ${source} regarding "${title}" signals a significant shift in regional dynamics. From a realist perspective, India must maintain strategic autonomy while navigating this competition for influence. Economic realism suggests we monitor energy and trade implications closely.`;
  const fallbackArticle = `
# Executive Summary
The recent development regarding "${title}" at ${source} represents a key geopolitical signal.

# Strategic Implications
India's strategic autonomy remains the cornerstone of its foreign policy. This event requires careful calibration of relations with key global partners.

# Economic & Resource Reality
Trade route stability and energy security must be prioritized.

# The Path Ahead
Continuous monitoring is necessary.
  `.trim();

  if (!GROQ_API_KEY) {
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle };
  }

  const prompt = `
    You are Shivam Punjabi, a realist geopolitical analyst.
    Analyze this news item with an "India-First" strategic lens.
    Focus on: Strategic Autonomy, Economic Realism (Energy/Trade), and Hidden Power Dynamics.
    Style: Deep, insightful, narrative-driven, yet accessible. Avoid mainstream rhetoric.
    News Title: ${title}
    Source: ${source}
    
    Respond ONLY with a JSON object containing two fields:
    {
      "telegramAnalysis": "A concise, hard-hitting analysis (max 120 words) suitable for a Telegram post.",
      "fullArticle": "A detailed, long-form analytical article (300-450 words) with markdown titles: # Executive Summary, # Strategic Implications, # Economic & Resource Reality, # The Path Ahead."
    }
  `.trim();

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.telegramAnalysis && parsed.fullArticle) {
        return {
          telegramAnalysis: parsed.telegramAnalysis.trim(),
          fullArticle: parsed.fullArticle.trim()
        };
      }
    }
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle };
  } catch (e) {
    console.error("Groq Error:", e);
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle };
  }
}

async function getStoredArticles() {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${ARTICLES_FILE}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString().trim();
    return JSON.parse(content || '[]');
  } catch (e) { 
    console.error('Failed to get articles:', e);
    return []; 
  }
}

async function updateStoredArticles(articles: any[]) {
  if (!GITHUB_TOKEN) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${ARTICLES_FILE}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    let sha = '';
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
    const content = JSON.stringify(articles, null, 2);
    await fetch(`https://api.github.com/repos/${REPO}/contents/${ARTICLES_FILE}`, {
      method: 'PUT',
      headers: { 
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        message: 'Update intelligence articles database [skip ci]',
        content: Buffer.from(content).toString('base64'),
        sha: sha
      })
    });
  } catch (e) { console.error('Articles Update Failed:', e); }
}

function escapeHTML(str: string) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m] || m));
}

export default async function handler(req: any, res: any) {
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=geopolitics+india+conflict&hl=en-IN&gl=IN&ceid=IN:en';
    const response = await fetch(rssUrl);
    const xml = await response.text();

    const items = xml.split('<item>');
    if (items.length < 2) return res.status(200).json({ status: 'no news' });

    // Extract potential news
    const newsItems = items.slice(1, 10).map(item => {
      const titleMatch = item.match(/<title[^>]*>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i);
      const sourceMatch = item.match(/<source[^>]*url=["'](.*?)["'][^>]*>(.*?)<\/source>/i);
      
      const title = (titleMatch ? titleMatch[1] : '').replace(/&amp;/g, '&').trim();
      const link = (linkMatch ? linkMatch[1] : '').trim();
      const sourceName = (sourceMatch ? sourceMatch[2] : (item.match(/<source[^>]*>(.*?)<\/source>/i)?.[1] || 'Global Source')).split('<')[0].trim();
      const directUrl = sourceMatch ? sourceMatch[1].trim() : link;
      
      return { title, link: directUrl, source: sourceName };
    }).filter(item => item.title && item.link);

    if (newsItems.length === 0) return res.status(200).json({ status: 'no valid news' });

    // Persistent Deduplication - skip anything already posted in recent history, not just the last one
    const currentArticles = await getStoredArticles();
    const postedTitles = new Set(currentArticles.map((a: any) => a.title));
    const selectedNews = newsItems.find(item => !postedTitles.has(item.title)) || (req.query.force ? newsItems[0] : null);

    if (!selectedNews) {
      return res.status(200).json({ status: 'skipped', reason: 'Already posted latest news' });
    }

    // Dynamic Analysis (Concise & Full Article)
    const { telegramAnalysis, fullArticle } = await getAnalysis(selectedNews.title, selectedNews.source);

    // Unique ID for the article
    const articleId = 'art_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    // Save article to GitHub database
    const newArticle = {
      id: articleId,
      title: selectedNews.title,
      date: new Date().toISOString(),
      source: selectedNews.source,
      sourceUrl: selectedNews.link,
      telegramAnalysis: telegramAnalysis,
      fullArticle: fullArticle
    };
    currentArticles.unshift(newArticle);
    if (currentArticles.length > 50) {
      currentArticles.pop();
    }
    await updateStoredArticles(currentArticles);
    
    // Safely format for HTML mode
    const title = escapeHTML(selectedNews.title);
    const analysis = escapeHTML(telegramAnalysis);
    const source = escapeHTML(selectedNews.source);
    const link = selectedNews.link;
    const webArticleLink = `https://geopolitical-dashboard-steel.vercel.app/?article=${articleId}`;

    const intelMessage = `
<b>📢 STRATEGIC BULLETIN</b>
--------------------------------
<b>🚀 DEVELOPMENT:</b> 
${title.toUpperCase()}

<b>📍 THE SITUATION:</b> 
High-signal development detected. Strategic assessment follows.

<b>🧠 EXPERT ANALYSIS (Shivam Punjabi Style):</b>
${analysis}

<b>🔗 Source:</b> ${source}
<b>🌐 Web Dashboard:</b> <a href="${webArticleLink}">Read Full Deep-Dive Analysis</a>

--------------------------------
📡 <b>Official Feed:</b> @IndiaWorldIntel (v2.0 AI-Driven)
    `.trim();

    // Viral Sharing Buttons
    const shareText = encodeURIComponent(`🚨 Intelligence Alert: ${selectedNews.title}\n\nJoin the live feed: https://t.me/IndiaWorldIntel`);
    
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: intelMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Share on X', url: `https://twitter.com/intent/tweet?text=${shareText}` },
              { text: '📱 WhatsApp', url: `https://wa.me/?text=${shareText}` }
            ],
            [
              { text: '📖 Read Full Deep-Dive', url: webArticleLink },
              { text: '🌐 Source Report', url: link }
            ]
          ]
        }
      }),
    });

    const socialPitch = `🚨 ${selectedNews.title}\n\n${webArticleLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch),
      postToThreads(socialPitch)
    ]);

    return res.status(200).json({ status: 'success', news: selectedNews.title, articleId });

  } catch (error: any) {
    console.error('POLL ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}

