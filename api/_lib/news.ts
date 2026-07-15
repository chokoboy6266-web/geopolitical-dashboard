// @ts-nocheck
const ALLOWED_SOURCE_SITES = [
  'reuters.com',
  'firstpost.com',
  'indiatoday.in',
  'theguardian.com',
  'bbc.com',
  'bbc.co.uk',
  'israelhayom.co.il',
  'israelhayom.com',
  'timesofindia.indiatimes.com'
];

const ALLOWED_SOURCE_NAMES = [
  'reuters',
  'firstpost',
  'india today',
  'guardian',
  'bbc',
  'israel hayom',
  'times of india'
];

const SITE_FILTER = ALLOWED_SOURCE_SITES.map(site => `site:${site}`).join(' OR ');

export const RSS_TOPICS = [
  `geopolitics india conflict (${SITE_FILTER})`,
  `india defense strategic security (${SITE_FILTER})`,
  `china pakistan border india (${SITE_FILTER})`,
  `global trade energy security india (${SITE_FILTER})`
];

function isAllowedSource(sourceName: string): boolean {
  const lower = sourceName.toLowerCase();
  return ALLOWED_SOURCE_NAMES.some(name => lower.includes(name));
}

const HUB_PAGE_PATTERNS = [
  /latest (top )?(stories|news)/i,
  /news (&|and) updates/i,
  /^(world|india|china|business|sport|technology) news\b/i
];

function isRealArticle(title: string): boolean {
  return !HUB_PAGE_PATTERNS.some(pattern => pattern.test(title));
}

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

    // Note: <source url="..."> is the publisher's homepage, not the article - always use <link> for the actual story.
    return { title, link: linkMatchUrl, source: sourceName };
  }).filter(item => item.title && item.link && isAllowedSource(item.source) && isRealArticle(item.title));
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
