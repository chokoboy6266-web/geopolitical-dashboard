// @ts-nocheck
import { postToBluesky, postToThreads } from './_lib/social.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROK_API_KEY; // Groq (fast inference), not xAI's Grok
const CHANNEL_ID = '@IndiaWorldIntel';

function escapeHTML(str: string) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m] || m));
}

async function getDigest(newsItems: { title: string, source: string, link: string }[], type: string) {
  const fallbackText = `
<b>📢 ${type.toUpperCase()} GEOPOLITICAL INTELLIGENCE DIGEST</b>
--------------------------------
Here is your strategic briefing of the top developments:
${newsItems.slice(0, 10).map((item, index) => `${index + 1}. <b>${escapeHTML(item.title)}</b> (${escapeHTML(item.source)})`).join('\n\n')}
--------------------------------
📡 <b>Official Feed:</b> @IndiaWorldIntel
  `.trim();

  if (!GROQ_API_KEY) {
    return fallbackText;
  }

  const prompt = `
    You are Shivam Punjabi, a realist geopolitical analyst.
    Analyze the following top 10 news items and compile a "${type}" Geopolitical Intelligence Digest with an "India-First" strategic lens.
    Keep the analysis realist, focusing on Strategic Autonomy, Economic/Resource realities, and Power shifts.
    
    Format the message beautifully for Telegram HTML mode.
    Structure:
    <b>📢 ${type.toUpperCase()} GEOPOLITICAL INTELLIGENCE DIGEST</b>
    --------------------------------
    (Brief 1-2 sentence opening overview of today's systemic shifts)
    
    (For each news item, list it numbered 1 to 10):
    <b>[Number]. [News Title]</b> [Source Name]
    • <i>Analysis:</i> [Concise 1-sentence realist analysis of why this matters for India/Global power]
    
    --------------------------------
    📡 <b>Official Feed:</b> @IndiaWorldIntel (v2.0 AI-Driven)
    
    News Items:
    ${JSON.stringify(newsItems.slice(0, 10), null, 2)}
    
    CRITICAL: Keep the entire response under 600 words so it fits Telegram's character limits. Ensure every HTML tag opened is closed correctly. Use ONLY <b>, <i>, and <a> tags.
  `.trim();

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || fallbackText;
  } catch (e) {
    console.error("Digest Groq Error:", e);
    return fallbackText;
  }
}

export default async function handler(req: any, res: any) {
  try {
    // Determine morning or night
    const currentHour = new Date().getUTCHours();
    // 0-11 UTC is morning/early afternoon in India, 12-23 UTC is evening/night
    const type = (currentHour < 12) ? 'Morning' : 'Evening';

    const rssUrl = 'https://news.google.com/rss/search?q=geopolitics+india+conflict&hl=en-IN&gl=IN&ceid=IN:en';
    const response = await fetch(rssUrl);
    const xml = await response.text();

    const items = xml.split('<item>');
    if (items.length < 2) return res.status(200).json({ status: 'no news' });

    // Extract news
    const newsItems = items.slice(1, 15).map(item => {
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

    // Compile the digest using Gemini
    const digestText = await getDigest(newsItems, type);

    // Send to Telegram
    const telResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: digestText,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
    });

    const telData = await telResponse.json();

    const digestLink = 'https://t.me/IndiaWorldIntel';
    const socialPitch = `📢 ${type} Geopolitical Intelligence Digest is live — top developments in India & global strategy.\n\nFull briefing: ${digestLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch, {
        url: digestLink,
        title: `${type} Geopolitical Intelligence Digest`,
        description: 'Top India & global strategic developments, live now.'
      }),
      postToThreads(socialPitch)
    ]);

    return res.status(200).json({
      status: 'success', 
      type, 
      telegramResponse: telData.ok ? 'sent' : 'failed',
      telegramError: telData.description || null
    });

  } catch (error: any) {
    console.error('DIGEST ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
