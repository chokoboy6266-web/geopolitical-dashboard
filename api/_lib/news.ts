// @ts-nocheck
export const RSS_TOPICS = [
  'geopolitics india conflict',
  'india defense strategic security',
  'china pakistan border india',
  'global trade energy security india'
];

function parseRssItems(xml: string, limit: number) {
  const items = xml.split('<item>');
  if (items.length < 2) return [];
  return items.slice(1, limit + 1).map(item => {
    const titleMatch = item.match(/<title[^>]*>(.*?)<\/title>/i);
    const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i);
    const sourceMatch = item.match(/<source[^>]*url=["'](.*?)["'][^>]*>(.*?)<\/source>/i);

    const title = (titleMatch ? titleMatch[1] : '').replace(/&amp;/g, '&').trim();
    const linkMatchUrl = (linkMatch ? linkMatch[1] : '').trim();
    const sourceName = (sourceMatch ? sourceMatch[2] : (item.match(/<source[^>]*>(.*?)<\/source>/i)?.[1] || 'Global Source')).split('<')[0].trim();
    const directUrl = sourceMatch ? sourceMatch[1].trim() : linkMatchUrl;

    return { title, link: directUrl, source: sourceName };
  }).filter(item => item.title && item.link);
}

export async function fetchNewsItems(limitPerTopic = 10): Promise<{ title: string; link: string; source: string }[]> {
  const results = await Promise.allSettled(
    RSS_TOPICS.map(topic =>
      fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-IN&gl=IN&ceid=IN:en`)
        .then(res => res.text())
        .then(xml => parseRssItems(xml, limitPerTopic))
    )
  );

  const merged: { title: string; link: string; source: string }[] = [];
  const seenTitles = new Set<string>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      const key = item.title.toLowerCase().trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      merged.push(item);
    }
  }
  return merged;
}
