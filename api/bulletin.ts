// @ts-nocheck
import { postToBluesky, postToThreads } from './_lib/social.js';
import { fetchNewsItems } from './_lib/news.js';
import { getJsonFile, updateJsonFile } from './_lib/github-store.js';
import { getHashtags } from './_lib/hashtags.js';

const ARTICLES_FILE = 'api/articles.json';
const HEADLINES_FILE = 'api/posted-headlines.json';
const MAX_PER_RUN = 2;
const MAX_HISTORY = 300;

function getRepresentationalImage(title: string): string {
  const prompt = encodeURIComponent(`${title}, geopolitics news illustration, professional editorial style`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true`;
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

    const selected = newsItems.filter(item => !postedTitles.has(item.title)).slice(0, MAX_PER_RUN);
    if (selected.length === 0) {
      return res.status(200).json({ status: 'skipped', reason: 'No fresh headlines' });
    }

    const results = await Promise.allSettled(selected.map(async item => {
      const text = `📰 ${item.title}\n\n${item.link}\n\n${getHashtags(item.title)}`;
      const imageUrl = getRepresentationalImage(item.title);
      await Promise.allSettled([
        postToBluesky(text, {
          url: item.link,
          title: item.title,
          description: `Latest via India World Intel — ${item.source}`,
          imageUrl
        }),
        postToThreads(text)
      ]);
    }));

    const posted = selected.filter((_, i) => results[i].status === 'fulfilled');
    const updatedHistory = [
      ...posted.map(item => ({ title: item.title, date: new Date().toISOString() })),
      ...headlineHistory
    ].slice(0, MAX_HISTORY);
    await updateJsonFile(HEADLINES_FILE, updatedHistory, 'Update posted headlines log [skip ci]');

    return res.status(200).json({ status: 'success', posted: posted.map(item => item.title) });

  } catch (error: any) {
    console.error('BULLETIN ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
}
