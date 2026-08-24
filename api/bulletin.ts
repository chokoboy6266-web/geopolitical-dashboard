// @ts-nocheck
import { postToBluesky, postToThreads } from './_lib/social.js';
import { fetchNewsItems, selectDiverseNews } from './_lib/news.js';
import { getJsonFile, updateJsonFile } from './_lib/github-store.js';
import { getHashtags } from './_lib/hashtags.js';

const GROQ_API_KEY = process.env.GROK_API_KEY; // Groq (fast inference), not xAI's Grok
const ARTICLES_FILE = 'api/articles.json';
const HEADLINES_FILE = 'api/posted-headlines.json';
const MAX_PER_RUN = 1;
const MAX_HISTORY = 300;

function getRepresentationalImage(title: string): string {
  const prompt = encodeURIComponent(`${title}, geopolitics news illustration, professional editorial style`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true`;
}

// A short, punchy analytical take (not a headline restatement) so Bluesky/Threads
// posts read like editorial voice instead of a generic RSS-to-social bot.
async function getSocialHook(title: string, source: string): Promise<string> {
  if (!GROQ_API_KEY) return `📰 ${title}`;
  const prompt = `
    You are Shivam Punjabi, a realist geopolitical analyst with an India-first strategic lens.
    Write ONE punchy, insightful sentence (max 30 words) reacting to this news for a social media post.
    It must read like sharp analysis, not a restated headline. Plain text only, no quotes, no hashtags, no emoji.
    News: ${title} (${source})
  `.trim();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const hook = data.choices?.[0]?.message?.content?.trim();
    return hook ? `🧭 ${hook}` : `📰 ${title}`;
  } catch (e) {
    console.error('Bulletin hook Groq Error:', e);
    return `📰 ${title}`;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const newsItems = await fetchNewsItems();
    if (newsItems.length === 0) return res.status(200).json({ status: 'no valid news' });

    const [articles, headlineHistory] = await Promise.all([
      getJsonFile(ARTICLES_FILE),
      getJsonFile(HEADLINES_FILE)
    ]);
    const postedTitles = new Set([
      ...articles.map((a: any) => a.title),
      ...headlineHistory.map((h: any) => h.title)
    ]);
    const recentSources = [
      ...headlineHistory.slice(0, 12).map((h: any) => h.source).filter(Boolean),
      ...articles.slice(0, 12).map((a: any) => a.source).filter(Boolean)
    ];

    const selected = selectDiverseNews(newsItems, postedTitles, recentSources, MAX_PER_RUN);
    if (selected.length === 0) {
      return res.status(200).json({ status: 'skipped', reason: 'No fresh headlines' });
    }

    const results = await Promise.allSettled(selected.map(async item => {
      const hook = await getSocialHook(item.title, item.source);
      const hashtags = getHashtags(item.title);
      const imageUrl = getRepresentationalImage(item.title);
      await Promise.allSettled([
        // No raw link in the Bluesky text: the embed card below already carries
        // a working link, and article URLs (Google News redirects) can run 700+
        // chars — far past the 300-char post limit, which was truncating mid-URL
        // and eating the hashtags after it.
        postToBluesky(`${hook}\n\n${hashtags}`, {
          url: item.link,
          title: item.title,
          description: `Latest via India World Intel — ${item.source}`,
          imageUrl
        }),
        postToThreads(`${hook}\n\n${item.link}\n\n${hashtags}`)
      ]);
    }));

    const posted = selected.filter((_, i) => results[i].status === 'fulfilled');
    const updatedHistory = [
      ...posted.map(item => ({ title: item.title, source: item.source, date: new Date().toISOString() })),
      ...headlineHistory
    ].slice(0, MAX_HISTORY);
    await updateJsonFile(HEADLINES_FILE, updatedHistory, 'Update posted headlines log [skip ci]');

    return res.status(200).json({ status: 'success', posted: posted.map(item => item.title) });

  } catch (error: any) {
    console.error('BULLETIN ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
