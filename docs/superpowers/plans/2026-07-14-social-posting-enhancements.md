# Social Posting Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Bluesky clickable-link bug, source news from multiple RSS topics instead of one, have the AI write hashtags/hook lines and an image prompt per post, generate and attach a free AI image to every Bluesky/Threads/Telegram post, and trigger `/api/poll` every 4 hours via GitHub Actions instead of Vercel's once-daily Hobby cron.

**Architecture:** A new `api/_lib/news.ts` centralizes multi-topic RSS fetching (replacing duplicated single-query logic in `poll.ts`/`digest.ts`). `api/_lib/social.ts` gains Bluesky rich-text facets (for clickable links), a Bluesky image-embed path (fetch → `uploadBlob` → attach), and Threads' native `image_url` support. Both `poll.ts` and `digest.ts` extend their existing single Groq JSON call with two new fields (`socialHook`, `imagePrompt`) instead of making a second AI call, then build a Pollinations.ai image URL from `imagePrompt` and pass it through to all three platforms. A new GitHub Actions workflow replaces Vercel's `/api/poll` cron entry with a free 4-hourly trigger.

**Tech Stack:** TypeScript (Vercel serverless functions, `// @ts-nocheck` per existing convention), plain `fetch`, no new npm dependencies, GitHub Actions (YAML), Pollinations.ai (free, keyless image generation).

## Global Constraints

- No test framework exists in this repo. Verification uses ad-hoc `node -e` scripts with the built-in `assert` module (stubbing `global.fetch`) plus `npx tsc --noEmit` for syntax checks — same convention as `docs/superpowers/plans/2026-07-13-social-cross-posting.md`.
- Any file under `api/` becomes a live Vercel route except paths starting with `_` — `api/_lib/news.ts` follows the same convention as `api/_lib/social.ts`.
- `RSS_TOPICS` (exact values, used verbatim in Task 1 and relied on by Tasks 3-4): `['geopolitics india conflict', 'india defense strategic security', 'china pakistan border india', 'global trade energy security india']`.
- Pollinations.ai image URL pattern (used verbatim in Tasks 3-4): `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=536&nologo=true&seed=${encodeURIComponent(seed)}` — no API key, no signup, no new env var.
- Bluesky posts truncate to 300 characters, Threads to 500 (unchanged from the existing `truncate()` helper).
- No new environment variables anywhere in this plan.
- Match existing style: plain `fetch`, `// @ts-nocheck` at the top of each file, `console.error` + swallow on non-critical failures (image/facet generation must never block a text post from going out).

---

### Task 1: Shared multi-topic news module

**Files:**
- Create: `api/_lib/news.ts`

**Interfaces:**
- Produces: `RSS_TOPICS: string[]`, `fetchNewsItems(limitPerTopic?: number): Promise<{ title: string; link: string; source: string }[]>` — fetches all topics in parallel, merges results in topic order, dedupes by case-insensitive trimmed title. Never throws (a failed topic fetch is simply excluded via `Promise.allSettled`).

- [ ] **Step 1: Write `api/_lib/news.ts`**

```ts
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
    const link = (linkMatch ? linkMatch[1] : '').trim();
    const sourceName = (sourceMatch ? sourceMatch[2] : (item.match(/<source[^>]*>(.*?)<\/source>/i)?.[1] || 'Global Source')).split('<')[0].trim();
    const directUrl = sourceMatch ? sourceMatch[1].trim() : link;

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
```

- [ ] **Step 2: Compile it for the verification script**

```bash
npx tsc api/_lib/news.ts --module commonjs --target es2019 --esModuleInterop --outDir .verify-tmp
```

- [ ] **Step 3: Verify parallel fetch, merge, and dedupe**

```bash
node -e "
const assert = require('assert');

function xmlWith(titles) {
  return '<rss><channel>' + titles.map(t =>
    \`<item><title>\${t}</title><link>http://example.com/\${encodeURIComponent(t)}</link><source url=\"http://example.com\">Example Source</source></item>\`
  ).join('') + '</channel></rss>';
}

const calls = [];
global.fetch = async (url) => {
  calls.push(url);
  if (url.includes(encodeURIComponent('geopolitics india conflict'))) return { text: async () => xmlWith(['Alpha Story', 'Common Story']) };
  if (url.includes(encodeURIComponent('india defense strategic security'))) return { text: async () => xmlWith(['Beta Story', 'common story']) };
  if (url.includes(encodeURIComponent('china pakistan border india'))) return { text: async () => xmlWith(['Gamma Story']) };
  if (url.includes(encodeURIComponent('global trade energy security india'))) return { text: async () => xmlWith([]) };
  throw new Error('unexpected url: ' + url);
};

const { fetchNewsItems, RSS_TOPICS } = require('./.verify-tmp/news.js');

(async () => {
  const items = await fetchNewsItems();
  assert.strictEqual(calls.length, 4, 'expected one fetch per RSS topic');
  assert.strictEqual(RSS_TOPICS.length, 4);
  assert.strictEqual(items.length, 4, 'expected 4 merged items after case-insensitive dedupe of Common Story / common story');
  const titles = items.map(i => i.title);
  assert.deepStrictEqual(titles, ['Alpha Story', 'Common Story', 'Beta Story', 'Gamma Story'], 'expected topic-order merge with first-seen dedupe');
  console.log('PASS: multi-topic fetch, merge, and dedupe correct');
})();
"
rm -rf .verify-tmp
```

Expected output: `PASS: multi-topic fetch, merge, and dedupe correct`

- [ ] **Step 4: Commit**

```bash
git add api/_lib/news.ts
git commit -m "feat: add shared multi-topic RSS news fetcher"
```

---

### Task 2: Bluesky clickable links + image support, Threads image support

**Files:**
- Modify: `api/_lib/social.ts` (entire file rewritten below)

**Interfaces:**
- Consumes: nothing new (still plain `fetch`, no SDK).
- Produces: `postToBluesky(text: string, opts?: { linkUrl?: string; imageUrl?: string; imageAlt?: string }): Promise<void>`, `postToThreads(text: string, opts?: { imageUrl?: string }): Promise<void>` — both remain silent no-ops if their env vars are unset, and both still swallow all errors (image/facet failures degrade to a text-only post rather than blocking it).

- [ ] **Step 1: Rewrite `api/_lib/social.ts`**

```ts
// @ts-nocheck
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

function toFacets(text: string, linkUrl: string) {
  const idx = text.indexOf(linkUrl);
  if (idx === -1) return undefined;
  const enc = new TextEncoder();
  const byteStart = enc.encode(text.slice(0, idx)).length;
  const byteEnd = byteStart + enc.encode(linkUrl).length;
  return [{
    index: { byteStart, byteEnd },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: linkUrl }]
  }];
}

async function uploadBlueskyImage(accessJwt: string, imageUrl: string) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const uploadRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${accessJwt}`
    },
    body: buffer
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.message || 'Bluesky blob upload failed');
  return uploadData.blob;
}

export async function postToBluesky(text: string, opts?: { linkUrl?: string; imageUrl?: string; imageAlt?: string }): Promise<void> {
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) return;
  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD })
    });
    const session = await sessionRes.json();
    if (!session.accessJwt) throw new Error(session.message || 'Bluesky login failed');

    const truncatedText = truncate(text, 300);
    const record: any = {
      $type: 'app.bsky.feed.post',
      text: truncatedText,
      createdAt: new Date().toISOString()
    };

    if (opts?.linkUrl) {
      const facets = toFacets(truncatedText, opts.linkUrl);
      if (facets) record.facets = facets;
    }

    if (opts?.imageUrl) {
      try {
        const blob = await uploadBlueskyImage(session.accessJwt, opts.imageUrl);
        record.embed = {
          $type: 'app.bsky.embed.images',
          images: [{ image: blob, alt: opts.imageAlt || '' }]
        };
      } catch (imgErr) {
        console.error('Bluesky image embed skipped:', imgErr);
      }
    }

    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessJwt}`
      },
      body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record })
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.message || 'Bluesky post failed');
  } catch (e) {
    console.error('Bluesky Error:', e);
  }
}

export async function postToThreads(text: string, opts?: { imageUrl?: string }): Promise<void> {
  if (!THREADS_ACCESS_TOKEN || !THREADS_USER_ID) return;
  try {
    const createBody: any = {
      media_type: opts?.imageUrl ? 'IMAGE' : 'TEXT',
      text: truncate(text, 500),
      access_token: THREADS_ACCESS_TOKEN
    };
    if (opts?.imageUrl) createBody.image_url = opts.imageUrl;

    const createRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody)
    });
    const createData = await createRes.json();
    if (!createData.id) throw new Error(createData.error?.message || 'Threads container creation failed');

    const publishRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: THREADS_ACCESS_TOKEN
      })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) throw new Error(publishData.error?.message || 'Threads publish failed');
  } catch (e) {
    console.error('Threads Error:', e);
  }
}
```

- [ ] **Step 2: Compile it for the verification script**

```bash
npx tsc api/_lib/social.ts --module commonjs --target es2019 --esModuleInterop --outDir .verify-tmp
```

- [ ] **Step 3: Verify facets, image embed, image-failure fallback, and Threads image mode**

```bash
node -e "
const assert = require('assert');
process.env.BLUESKY_HANDLE = 'test.bsky.social';
process.env.BLUESKY_APP_PASSWORD = 'abcd-1234';
process.env.THREADS_ACCESS_TOKEN = 'fake-token';
process.env.THREADS_USER_ID = '12345';

let failUpload = false;
const calls = [];
function mockRes(body, opts = {}) {
  return {
    ok: opts.ok !== false,
    status: opts.status || 200,
    headers: { get: () => 'image/jpeg' },
    json: async () => body,
    arrayBuffer: async () => Buffer.from('fake-image-bytes')
  };
}
global.fetch = async (url, fetchOpts) => {
  const body = fetchOpts && typeof fetchOpts.body === 'string' && fetchOpts.headers && fetchOpts.headers['Content-Type'] === 'application/json'
    ? JSON.parse(fetchOpts.body) : fetchOpts && fetchOpts.body;
  calls.push({ url, body });
  if (url.includes('createSession')) return mockRes({ accessJwt: 'jwt', did: 'did:plc:test' });
  if (url === 'https://fake-image.test/pic.jpg') return mockRes(null);
  if (url.includes('uploadBlob')) return failUpload
    ? mockRes({ message: 'boom' }, { ok: false, status: 500 })
    : mockRes({ blob: { \$type: 'blob', ref: { \$link: 'bafy-fake' }, mimeType: 'image/jpeg', size: 100 } });
  if (url.includes('createRecord')) return mockRes({ uri: 'at://test' });
  if (url.endsWith('/threads')) return mockRes({ id: 'container-1' });
  if (url.includes('threads_publish')) return mockRes({ id: 'published-1' });
  return mockRes({});
};

const { postToBluesky, postToThreads } = require('./.verify-tmp/social.js');

(async () => {
  // 1. Facets computed correctly for an ASCII link
  calls.length = 0;
  const text1 = 'Check this out: https://example.com/article';
  await postToBluesky(text1, { linkUrl: 'https://example.com/article' });
  const rec1 = calls.find(c => c.url.includes('createRecord')).body.record;
  assert.ok(rec1.facets, 'expected facets to be set');
  assert.strictEqual(rec1.facets[0].index.byteStart, Buffer.byteLength('Check this out: '));
  assert.strictEqual(rec1.facets[0].index.byteEnd, Buffer.byteLength('Check this out: https://example.com/article'));
  assert.strictEqual(rec1.facets[0].features[0].uri, 'https://example.com/article');
  console.log('PASS: facets computed correctly');

  // 2. Image embed attached on success
  calls.length = 0;
  await postToBluesky('Post with image', { imageUrl: 'https://fake-image.test/pic.jpg', imageAlt: 'A test image' });
  const rec2 = calls.find(c => c.url.includes('createRecord')).body.record;
  assert.strictEqual(rec2.embed.\$type, 'app.bsky.embed.images');
  assert.strictEqual(rec2.embed.images[0].alt, 'A test image');
  console.log('PASS: image embed attached');

  // 3. Failed upload still posts text-only, does not throw
  calls.length = 0;
  failUpload = true;
  await postToBluesky('Post with failing upload', { imageUrl: 'https://fake-image.test/pic.jpg' });
  failUpload = false;
  const rec3call = calls.find(c => c.url.includes('createRecord'));
  assert.ok(rec3call, 'expected createRecord to still be called after upload failure');
  assert.strictEqual(rec3call.body.record.embed, undefined, 'expected no embed when upload fails');
  console.log('PASS: failed image upload still posts text-only');

  // 4. Threads media_type switches to IMAGE when imageUrl passed
  calls.length = 0;
  await postToThreads('Digest is live', { imageUrl: 'https://fake-image.test/pic.jpg' });
  const threadsCreate = calls.find(c => c.url.endsWith('/threads'));
  assert.strictEqual(threadsCreate.body.media_type, 'IMAGE');
  assert.strictEqual(threadsCreate.body.image_url, 'https://fake-image.test/pic.jpg');
  console.log('PASS: Threads image media_type set correctly');

  calls.length = 0;
  await postToThreads('Text only post');
  const threadsCreate2 = calls.find(c => c.url.endsWith('/threads'));
  assert.strictEqual(threadsCreate2.body.media_type, 'TEXT');
  assert.strictEqual(threadsCreate2.body.image_url, undefined);
  console.log('PASS: Threads text-only media_type unchanged');
})();
"
rm -rf .verify-tmp
```

Expected output: five `PASS:` lines.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/social.ts
git commit -m "feat: add Bluesky clickable-link facets and image support to both platforms"
```

---

### Task 3: Wire `api/poll.ts` to multi-topic sourcing, AI hooks, and images

**Files:**
- Modify: `api/poll.ts:1-2` (imports), `api/poll.ts:11-73` (`getAnalysis`), `api/poll.ts:124-159` (RSS fetch + destructure), `api/poll.ts:185, 206-236` (image URL, Telegram photo, social calls)

**Interfaces:**
- Consumes: `fetchNewsItems(): Promise<{title,link,source}[]>` (Task 1), `postToBluesky(text, opts)` / `postToThreads(text, opts)` (Task 2).

- [ ] **Step 1: Add the `fetchNewsItems` import**

In `api/poll.ts`, change line 2 from:
```ts
import { postToBluesky, postToThreads } from './_lib/social';
```
to:
```ts
import { postToBluesky, postToThreads } from './_lib/social';
import { fetchNewsItems } from './_lib/news';
```

- [ ] **Step 2: Extend `getAnalysis` with `socialHook` and `imagePrompt`**

Replace the entire `getAnalysis` function (`api/poll.ts:11-73`) with:

```ts
async function getAnalysis(title: string, source: string): Promise<{ telegramAnalysis: string; fullArticle: string; socialHook: string; imagePrompt: string }> {
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
  const fallbackSocialHook = `🚨 Breaking geopolitical development. #Geopolitics #India #WorldNews`;
  const fallbackImagePrompt = `editorial illustration of a world map with India highlighted, dramatic lighting, geopolitical news style, no text`;

  if (!GROQ_API_KEY) {
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  }

  const prompt = `
    You are Shivam Punjabi, a realist geopolitical analyst.
    Analyze this news item with an "India-First" strategic lens.
    Focus on: Strategic Autonomy, Economic Realism (Energy/Trade), and Hidden Power Dynamics.
    Style: Deep, insightful, narrative-driven, yet accessible. Avoid mainstream rhetoric.
    News Title: ${title}
    Source: ${source}
    
    Respond ONLY with a JSON object containing four fields:
    {
      "telegramAnalysis": "A concise, hard-hitting analysis (max 120 words) suitable for a Telegram post.",
      "fullArticle": "A detailed, long-form analytical article (300-450 words) with markdown titles: # Executive Summary, # Strategic Implications, # Economic & Resource Reality, # The Path Ahead.",
      "socialHook": "A punchy, engaging hook sentence plus 3-5 relevant hashtags (e.g. #Geopolitics #IndiaFirst), max 200 characters total, suitable to headline a Bluesky/Threads post.",
      "imagePrompt": "A short (max 30 words) visual description for an AI image generator depicting this story — concrete imagery, editorial illustration style, no embedded text or words in the image."
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
      if (parsed.telegramAnalysis && parsed.fullArticle && parsed.socialHook && parsed.imagePrompt) {
        return {
          telegramAnalysis: parsed.telegramAnalysis.trim(),
          fullArticle: parsed.fullArticle.trim(),
          socialHook: parsed.socialHook.trim(),
          imagePrompt: parsed.imagePrompt.trim()
        };
      }
    }
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  } catch (e) {
    console.error("Groq Error:", e);
    return { telegramAnalysis: fallbackTelegram, fullArticle: fallbackArticle, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  }
}
```

- [ ] **Step 3: Replace the inline RSS fetch with `fetchNewsItems()`**

Replace this block (`api/poll.ts:124-147`, from `const rssUrl = ...` through the `newsItems` filter):
```ts
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
```

with:
```ts
    const newsItems = await fetchNewsItems();
    if (newsItems.length === 0) return res.status(200).json({ status: 'no valid news' });
```

- [ ] **Step 4: Update the `getAnalysis` destructure**

Change (`api/poll.ts:159`, now shifted up since Step 3 removed lines):
```ts
    const { telegramAnalysis, fullArticle } = await getAnalysis(selectedNews.title, selectedNews.source);
```
to:
```ts
    const { telegramAnalysis, fullArticle, socialHook, imagePrompt } = await getAnalysis(selectedNews.title, selectedNews.source);
```

- [ ] **Step 5: Add the image URL, a Telegram photo lead-in, and updated social calls**

Right after the existing `const webArticleLink = ...` line, add:
```ts
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=536&nologo=true&seed=${encodeURIComponent(articleId)}`;
```

Immediately before the existing Telegram `sendMessage` call (the one sending `intelMessage`), add a new photo lead-in:
```ts
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        photo: imageUrl,
        caption: title,
        parse_mode: 'HTML'
      }),
    });

```
(this uses the `title` variable already defined a few lines above via `const title = escapeHTML(selectedNews.title);` — the existing `sendMessage` call for `intelMessage` is left completely unchanged after this).

Finally, replace:
```ts
    const socialPitch = `🚨 ${selectedNews.title}\n\n${webArticleLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch),
      postToThreads(socialPitch)
    ]);
```
with:
```ts
    const socialPitch = `${socialHook}\n\n${webArticleLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch, { linkUrl: webArticleLink, imageUrl, imageAlt: selectedNews.title }),
      postToThreads(socialPitch, { imageUrl })
    ]);
```

- [ ] **Step 6: Syntax-check the file**

```bash
npx tsc --noEmit --target es2020 --module esnext --moduleResolution node --esModuleInterop api/_lib/social.ts api/_lib/news.ts api/poll.ts
```

Expected: no output (clean exit).

- [ ] **Step 7: Commit**

```bash
git add api/poll.ts
git commit -m "feat: multi-topic sourcing, AI hooks, and images for poll.ts posts"
```

---

### Task 4: Wire `api/digest.ts` to multi-topic sourcing, AI hooks, and images

**Files:**
- Modify: `api/digest.ts:1-2` (imports), `api/digest.ts:14-68` (`getDigest`), `api/digest.ts:77-121` (RSS fetch, Telegram send, social calls)

**Interfaces:**
- Consumes: same as Task 3.

- [ ] **Step 1: Add the `fetchNewsItems` import**

Change `api/digest.ts` line 2 from:
```ts
import { postToBluesky, postToThreads } from './_lib/social';
```
to:
```ts
import { postToBluesky, postToThreads } from './_lib/social';
import { fetchNewsItems } from './_lib/news';
```

- [ ] **Step 2: Rewrite `getDigest` to return `socialHook` and `imagePrompt` alongside the digest text**

Replace the entire `getDigest` function (`api/digest.ts:14-68`) with:

```ts
async function getDigest(newsItems: { title: string, source: string, link: string }[], type: string): Promise<{ digestText: string; socialHook: string; imagePrompt: string }> {
  const fallbackDigestText = `
<b>📢 ${type.toUpperCase()} GEOPOLITICAL INTELLIGENCE DIGEST</b>
--------------------------------
Here is your strategic briefing of the top developments:
${newsItems.slice(0, 10).map((item, index) => `${index + 1}. <b>${escapeHTML(item.title)}</b> (${escapeHTML(item.source)})`).join('\n\n')}
--------------------------------
📡 <b>Official Feed:</b> @IndiaWorldIntel
  `.trim();
  const fallbackSocialHook = `📢 ${type} Geopolitical Digest is live. #Geopolitics #India #WorldNews`;
  const fallbackImagePrompt = `editorial illustration of a world map with India highlighted, strategic briefing style, dramatic lighting, no text`;

  if (!GROQ_API_KEY) {
    return { digestText: fallbackDigestText, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  }

  const prompt = `
    You are Shivam Punjabi, a realist geopolitical analyst.
    Analyze the following top 10 news items and compile a "${type}" Geopolitical Intelligence Digest with an "India-First" strategic lens.
    Keep the analysis realist, focusing on Strategic Autonomy, Economic/Resource realities, and Power shifts.
    
    Respond ONLY with a JSON object containing three fields:
    {
      "digestText": "The full digest formatted beautifully for Telegram HTML mode, structured as: <b>📢 ${type.toUpperCase()} GEOPOLITICAL INTELLIGENCE DIGEST</b> followed by a '--------------------------------' divider, a brief 1-2 sentence opening overview, then each news item numbered 1 to 10 as '<b>[Number]. [News Title]</b> [Source Name]' followed by '• <i>Analysis:</i> [Concise 1-sentence realist analysis]', then a closing divider and '📡 <b>Official Feed:</b> @IndiaWorldIntel (v2.0 AI-Driven)'. Keep digestText under 600 words. Use ONLY <b>, <i>, and <a> HTML tags, and ensure every tag opened is closed correctly.",
      "socialHook": "A punchy, engaging hook sentence plus 3-5 relevant hashtags (e.g. #Geopolitics #IndiaFirst), max 200 characters total, suitable to headline a Bluesky/Threads post announcing this digest.",
      "imagePrompt": "A short (max 30 words) visual description for an AI image generator depicting a geopolitical news roundup — concrete imagery, editorial illustration style, no embedded text or words in the image."
    }
    
    News Items:
    ${JSON.stringify(newsItems.slice(0, 10), null, 2)}
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
      if (parsed.digestText && parsed.socialHook && parsed.imagePrompt) {
        return {
          digestText: parsed.digestText.trim(),
          socialHook: parsed.socialHook.trim(),
          imagePrompt: parsed.imagePrompt.trim()
        };
      }
    }
    return { digestText: fallbackDigestText, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  } catch (e) {
    console.error("Digest Groq Error:", e);
    return { digestText: fallbackDigestText, socialHook: fallbackSocialHook, imagePrompt: fallbackImagePrompt };
  }
}
```

- [ ] **Step 3: Replace the inline RSS fetch, Telegram send, and social calls**

Replace this block (`api/digest.ts:77-121`, from `const rssUrl = ...` through the closing `]);` of the `Promise.allSettled`):
```ts
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

    const socialPitch = `📢 ${type} Geopolitical Intelligence Digest is live — top developments in India & global strategy.\n\nFull briefing: https://t.me/IndiaWorldIntel`;
    await Promise.allSettled([
      postToBluesky(socialPitch),
      postToThreads(socialPitch)
    ]);
```

with:
```ts
    const newsItems = await fetchNewsItems();
    if (newsItems.length === 0) return res.status(200).json({ status: 'no valid news' });

    // Compile the digest using Groq
    const { digestText, socialHook, imagePrompt } = await getDigest(newsItems, type);

    const digestLink = 'https://t.me/IndiaWorldIntel';
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=536&nologo=true&seed=${encodeURIComponent(type + '-' + new Date().toISOString().slice(0, 10))}`;

    // Image lead-in to Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        photo: imageUrl,
        caption: `📢 ${type} Geopolitical Digest`,
        parse_mode: 'HTML'
      }),
    });

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

    const socialPitch = `${socialHook}\n\n${digestLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch, { linkUrl: digestLink, imageUrl, imageAlt: `${type} Geopolitical Digest` }),
      postToThreads(socialPitch, { imageUrl })
    ]);
```

- [ ] **Step 4: Syntax-check the file**

```bash
npx tsc --noEmit --target es2020 --module esnext --moduleResolution node --esModuleInterop api/_lib/social.ts api/_lib/news.ts api/digest.ts
```

Expected: no output (clean exit).

- [ ] **Step 5: Commit**

```bash
git add api/digest.ts
git commit -m "feat: multi-topic sourcing, AI hooks, and images for digest.ts posts"
```

---

### Task 5: Free 4-hourly trigger via GitHub Actions

**Files:**
- Create: `.github/workflows/social-poll.yml`
- Modify: `vercel.json`

**Interfaces:**
- None (infrastructure/config only — `/api/poll` itself is unchanged by this task).

- [ ] **Step 1: Write the GitHub Actions workflow**

```yaml
name: Scheduled Social Poll

on:
  schedule:
    - cron: '0 */4 * * *'
  workflow_dispatch: {}

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger poll endpoint
        run: curl -sf https://geopolitical-dashboard-steel.vercel.app/api/poll
```

- [ ] **Step 2: Remove `/api/poll`'s cron entry from `vercel.json`**

Replace the full contents of `vercel.json` with:
```json
{
  "crons": [
    {
      "path": "/api/digest",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/digest",
      "schedule": "0 15 * * *"
    }
  ],
  "functions": {
    "api/poll.ts": { "maxDuration": 60 },
    "api/digest.ts": { "maxDuration": 60 }
  }
}
```
(`api/poll.ts` keeps its `maxDuration` entry since it's still a deployed, invoked function — it's just triggered by GitHub Actions now instead of Vercel Cron.)

- [ ] **Step 3: Verify `vercel.json` is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('PASS: vercel.json is valid JSON')"
```

Expected output: `PASS: vercel.json is valid JSON`

- [ ] **Step 4: Verify the workflow file has the required keys**

```bash
node -e "
const assert = require('assert');
const fs = require('fs');
const content = fs.readFileSync('.github/workflows/social-poll.yml', 'utf8');
assert.ok(content.includes(\"cron: '0 */4 * * *'\"), 'expected the 4-hourly cron expression');
assert.ok(content.includes('workflow_dispatch'), 'expected manual trigger support');
assert.ok(content.includes('https://geopolitical-dashboard-steel.vercel.app/api/poll'), 'expected the poll endpoint URL');
console.log('PASS: workflow file has required keys');
"
```

Expected output: `PASS: workflow file has required keys`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/social-poll.yml vercel.json
git commit -m "feat: trigger poll every 4 hours via GitHub Actions instead of daily Vercel cron"
```

---

### Task 6: Document the new automation and image pipeline

**Files:**
- Modify: `walkthrough.md` (after the existing `.env` block in "Environment Configuration")

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Add a short note after the `.env` block**

In `walkthrough.md`, immediately after the closing ` ``` ` of the existing `.env` code block (after line 95), add:

```markdown

### Automation & Images (no new env vars)
- `/api/poll` is now triggered every 4 hours by `.github/workflows/social-poll.yml` (GitHub Actions, free) instead of Vercel's once-daily Hobby cron. It can also be run manually from the repo's Actions tab via "Run workflow".
- Post images are generated for free via [Pollinations.ai](https://pollinations.ai) — no API key or signup required. If an image fails to generate or upload, the post still goes out as text-only.
```

- [ ] **Step 2: Commit**

```bash
git add walkthrough.md
git commit -m "docs: document GitHub Actions polling schedule and free image generation"
```

## Post-plan manual step (not automatable)

Once all six tasks are committed and deployed:
1. Push to `main` (or merge) so Vercel redeploys with the updated `vercel.json` and the new `.github/workflows/social-poll.yml` becomes active.
2. From the repo's GitHub Actions tab, manually run "Scheduled Social Poll" once (`workflow_dispatch`) and confirm it succeeds (green check) — this is the first real end-to-end trigger since `/api/poll` no longer has a Vercel cron entry.
3. Check the Bluesky account: confirm the new post has a clickable link, an attached image, and a hashtag/hook line.
4. Check the Threads account: confirm the post shows the image.
5. Check the Telegram channel: confirm it shows an image+title message immediately followed by the existing full analysis message, unchanged in format.
6. Trigger `/api/digest` manually (`GET /api/digest`) and repeat steps 3-5 for the digest flow.
7. Watch Vercel's function logs for a day to confirm Groq's free-tier rate limits aren't being hit now that `/api/poll` can run up to 6x/day (fallback text/values kick in automatically if they are — no action needed, but worth knowing).
