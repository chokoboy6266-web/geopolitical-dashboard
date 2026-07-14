// @ts-nocheck
const GROQ_API_KEY = process.env.GROK_API_KEY;
const GITHUB_TOKEN = process.env.Github;
const REPO = 'chokoboy6266-web/geopolitical-dashboard';
const ARTICLES_FILE = 'api/articles.json';

async function getStoredArticles() {
  if (!GITHUB_TOKEN) return [];
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${ARTICLES_FILE}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString().trim();
  return JSON.parse(content || '[]');
}

export default async function handler(req: any, res: any) {
  const trace: any = { step: 'start' };
  try {
    trace.step = 'fetch_rss';
    const rssUrl = 'https://news.google.com/rss/search?q=geopolitics+india+conflict&hl=en-IN&gl=IN&ceid=IN:en';
    const response = await fetch(rssUrl);
    const xml = await response.text();
    trace.rssStatus = response.status;
    trace.xmlLength = xml.length;

    trace.step = 'parse_items';
    const items = xml.split('<item>');
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
    trace.newsItemsCount = newsItems.length;

    trace.step = 'get_stored_articles';
    const currentArticles = await getStoredArticles();
    trace.storedArticlesCount = currentArticles.length;

    trace.step = 'dedup';
    const postedTitles = new Set(currentArticles.map((a: any) => a.title));
    const selectedNews = newsItems.find(item => !postedTitles.has(item.title));
    trace.selectedNews = selectedNews;

    if (!selectedNews) {
      trace.step = 'done_no_selection';
      return res.status(200).json(trace);
    }

    trace.step = 'call_groq';
    const prompt = `Analyze this news item briefly. Title: ${selectedNews.title}. Respond ONLY with JSON: {"telegramAnalysis":"...","fullArticle":"..."}`;
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const gRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });
    trace.groqStatus = gRes.status;
    const gData = await gRes.json();
    const text = gData.choices?.[0]?.message?.content;
    trace.groqTextPresent = !!text;
    if (text) {
      const parsed = JSON.parse(text);
      trace.parsedOk = !!(parsed.telegramAnalysis && parsed.fullArticle);
    }

    trace.step = 'github_write_test';
    const writePath = 'api/_diagnostic_test.txt';
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${writePath}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    let sha;
    if (getRes.ok) sha = (await getRes.json()).sha;
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${writePath}`, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'diagnostic test write [skip ci]',
        content: Buffer.from('diagnostic').toString('base64'),
        sha
      })
    });
    trace.githubWriteStatus = putRes.status;
    const putData = await putRes.json();
    trace.githubWriteOk = putRes.ok;
    if (!putRes.ok) trace.githubWriteError = putData;

    if (putRes.ok) {
      trace.step = 'github_cleanup';
      const newSha = putData.content.sha;
      const delRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${writePath}`, {
        method: 'DELETE',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'diagnostic cleanup [skip ci]', sha: newSha })
      });
      trace.githubCleanupStatus = delRes.status;
    }

    trace.step = 'telegram_test';
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const CHANNEL_ID = '@IndiaWorldIntel';
    const telRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`, { method: 'GET' });
    trace.telegramGetMeStatus = telRes.status;
    trace.telegramGetMeOk = telRes.ok;

    trace.step = 'social_import_test';
    const social = await import('./_lib/social');
    trace.socialFunctionsPresent = {
      postToBluesky: typeof social.postToBluesky === 'function',
      postToThreads: typeof social.postToThreads === 'function'
    };

    trace.step = 'done';
    return res.status(200).json(trace);
  } catch (error: any) {
    trace.step = 'CRASHED_AT:' + trace.step;
    trace.error = error.message;
    trace.stack = error.stack;
    return res.status(500).json(trace);
  }
}
