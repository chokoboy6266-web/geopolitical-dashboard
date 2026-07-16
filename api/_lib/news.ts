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
  'timesofindia.indiatimes.com',
  'bloomberg.com',
  'nytimes.com',
  'washingtonpost.com',
  'news18.com',
  'wionews.com',
  'tass.com',
  'globaltimes.cn',
  'dailymail.co.uk',
  'theglobeandmail.com'
];

const ALLOWED_SOURCE_NAMES = [
  'reuters',
  'firstpost',
  'india today',
  'guardian',
  'bbc',
  'israel hayom',
  'israelhayom',
  'times of india',
  'bloomberg',
  'new york times',
  'washington post',
  'news18',
  'wion',
  'tass',
  'global times',
  'daily mail',
  'dailymail',
  'globe and mail'
];

// Google News' site:a OR site:b OR ... ranking silently crowds out low-volume domains once
// a query combines too many of them - high-volume sites (Reuters/Firstpost/etc.) win every
// slot and the rest never appear, even though they'd show up fine in a query of their own.
// Sites confirmed to coexist fine in one combined query stay grouped; everything else gets
// its own dedicated query so it isn't starved out.
const CORE_SOURCE_SITES = ['reuters.com', 'firstpost.com', 'indiatoday.in', 'theguardian.com', 'bbc.com', 'bbc.co.uk'];
const DEDICATED_SOURCE_SITES = ALLOWED_SOURCE_SITES.filter(site => !CORE_SOURCE_SITES.includes(site));

const CORE_SITE_FILTER = CORE_SOURCE_SITES.map(site => `site:${site}`).join(' OR ');

const TOPIC_KEYWORDS = [
  'global military conflict security',
  'global energy oil gas security',
  'technology semiconductor cyber security AI',
  'diplomacy geopolitics international relations summit'
];

export const RSS_TOPICS = [
  ...TOPIC_KEYWORDS.map(topic => `${topic} (${CORE_SITE_FILTER})`),
  ...DEDICATED_SOURCE_SITES.map(site => `geopolitics conflict security energy technology diplomacy site:${site}`)
];

function isAllowedSource(sourceName: string): boolean {
  const lower = sourceName.toLowerCase();
  return ALLOWED_SOURCE_NAMES.some(name => lower.includes(name));
}

const HUB_PAGE_PATTERNS = [
  /\bnews\s*\|/i,
  /latest.*(stories|news)/i,
  /news (&|and) updates/i,
  /^(world|india|china|business|sport|technology) news\b/i,
  /\bpage\s+\d+\s+of\s+\d+/i,
  /\blive streaming\b/i,
  /^news live\b/i
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
    const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);

    const title = (titleMatch ? titleMatch[1] : '').replace(/&amp;/g, '&').trim();
    const linkMatchUrl = (linkMatch ? linkMatch[1] : '').trim();
    const sourceName = (sourceMatch ? sourceMatch[2] : (item.match(/<source[^>]*>(.*?)<\/source>/i)?.[1] || 'Global Source')).split('<')[0].trim();
    const pubDate = pubDateMatch ? Date.parse(pubDateMatch[1]) : NaN;

    // Note: <source url="..."> is the publisher's homepage, not the article - always use <link> for the actual story.
    return { title, link: linkMatchUrl, source: sourceName, pubDate: isNaN(pubDate) ? 0 : pubDate };
  }).filter(item => item.title && item.link && isAllowedSource(item.source) && isRealArticle(item.title));
}

export async function fetchNewsItems(limitPerTopic = 10): Promise<{ title: string; link: string; source: string; pubDate: number }[]> {
  const results = await Promise.allSettled(
    RSS_TOPICS.map(topic =>
      fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-IN&gl=IN&ceid=IN:en`)
        .then(res => res.text())
        .then(xml => parseRssItems(xml, limitPerTopic))
    )
  );

  const merged: { title: string; link: string; source: string; pubDate: number }[] = [];
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
  // Freshest news first, regardless of which topic query or source surfaced it.
  merged.sort((a, b) => b.pubDate - a.pubDate);
  return merged;
}

// Picks up to `count` unposted items, favoring sources that haven't dominated recent posts
// and never repeating a source within the same batch unless there's no alternative left.
export function selectDiverseNews(
  items: { title: string; link: string; source: string }[],
  postedTitles: Set<string>,
  recentSources: string[],
  count: number
): { title: string; link: string; source: string }[] {
  const unposted = items.filter(item => !postedTitles.has(item.title));
  if (unposted.length === 0) return [];

  const overuseCounts = new Map<string, number>();
  for (const source of recentSources.slice(0, 12)) {
    const key = source.toLowerCase();
    overuseCounts.set(key, (overuseCounts.get(key) || 0) + 1);
  }
  const overused = new Set([...overuseCounts.entries()].filter(([, n]) => n >= 2).map(([key]) => key));

  const preferred = unposted.filter(item => !overused.has(item.source.toLowerCase()));
  const pool = preferred.length > 0 ? preferred : unposted;

  const selected: { title: string; link: string; source: string }[] = [];
  const usedThisBatch = new Set<string>();
  for (const item of pool) {
    if (selected.length >= count) break;
    const key = item.source.toLowerCase();
    if (usedThisBatch.has(key)) continue;
    usedThisBatch.add(key);
    selected.push(item);
  }
  if (selected.length < count) {
    for (const item of unposted) {
      if (selected.length >= count) break;
      if (selected.includes(item)) continue;
      selected.push(item);
    }
  }
  return selected;
}
