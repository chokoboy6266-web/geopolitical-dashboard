# Social Posting Enhancements: Clickable Links, More Sources, Hashtags, Images, Frequency — Design

## Purpose
The existing Bluesky/Threads/Telegram cross-posting (`api/poll.ts`, `api/digest.ts`, `api/_lib/social.ts`) has a real bug and three engagement gaps: Bluesky links aren't clickable, posts draw from a single narrow news query, posts have no hashtags/hook line, and posts have no image. Posting is also stuck at a fixed once-daily (poll) / twice-daily (digest) cadence. This design fixes the bug and adds source variety, AI-written hooks/hashtags, AI-generated images, and a plan-independent way to post more often — all with zero new paid services.

## Scope
In scope:
- `api/_lib/social.ts` — Bluesky rich-text facets (clickable links) + image embed; Threads image support.
- `api/_lib/news.ts` (new) — shared multi-topic RSS fetch, replacing the duplicated single-query fetch in `poll.ts`/`digest.ts`.
- `api/poll.ts`, `api/digest.ts` — use the shared news fetch; extend the existing Groq JSON prompt with `socialHook` and `imagePrompt` fields; generate and attach an image; add a Telegram image message.
- `.github/workflows/social-poll.yml` (new) — free scheduled trigger for `/api/poll` every 4 hours, replacing Vercel's once-daily cron for that endpoint.
- `vercel.json` — remove `/api/poll`'s cron entry (GitHub Actions now owns that trigger); `digest`'s two daily entries are unchanged.

Out of scope: approval workflows, analytics/tracking, Twitter/X posting (`twitter-api-v2` stays unused), any paid image or LLM service, authentication on the poll/digest endpoints (already public today; unchanged by this work), resizing/compressing images beyond requesting a moderate resolution from the generator.

## 1. Bug fix: clickable Bluesky links
Bluesky's `app.bsky.feed.post` schema requires a `facets` array — byte-offset-indexed rich-text entities — for a URL inside `text` to render as a hyperlink. Today `social.ts` sends only `{ text, createdAt, $type }`, so the link renders as dead text.

In `api/_lib/social.ts`:
```ts
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
```
`postToBluesky(text: string, opts?: { linkUrl?: string; imageUrl?: string })`: truncate `text` to 300 chars first (as today), *then* compute facets against the truncated string via `toFacets`. If `opts.linkUrl` isn't found (e.g. truncation cut into it), `facets` is simply omitted — no error, matches the existing tolerant style. `record.facets` is only set when facets are found.

Threads and Telegram already render plain URLs as clickable (Threads auto-links, Telegram already uses `<a href>` HTML) — no change needed there for link clickability.

## 2. More source variety
`poll.ts` and `digest.ts` currently duplicate the same regex-based RSS parsing against one hardcoded query. New `api/_lib/news.ts`:
```ts
export const RSS_TOPICS = [
  'geopolitics india conflict',
  'india defense strategic security',
  'china pakistan border india',
  'global trade energy security india'
];

export async function fetchNewsItems(): Promise<{ title: string; link: string; source: string }[]>
```
Fetches all topics in parallel (`Promise.allSettled`), reuses the existing item/title/link/source extraction logic (moved verbatim from `poll.ts`), merges in topic order, and dedupes by normalized (trimmed, case-insensitive) title. `poll.ts` and `digest.ts` both call this instead of their own inline fetch; downstream logic (pick first unposted / take top N for digest) is unchanged.

## 3. AI-generated hashtags + hook line
Extend the existing Groq JSON response (`getAnalysis()` in `poll.ts`, `getDigest()` in `digest.ts`) with two new fields, generated in the same call — no extra API request:
- `socialHook`: a punchy hook sentence plus 3-5 relevant hashtags, budgeted to stay well under 200 characters so it fits comfortably with the link inside Bluesky's 300-char limit.
- `imagePrompt`: a short (≤30 words) visual description for an image generator — concrete imagery, editorial-illustration style, explicitly no embedded text/words (image models render text poorly).

Fallback values (used when `GROQ_API_KEY` is absent or the call fails, mirroring the existing fallback pattern) are static generic strings for both fields.

`socialPitch` becomes `${socialHook}\n\n${webArticleLink}` (poll.ts) / `${socialHook}\n\n${link}` (digest.ts), replacing the current hand-built `🚨 {title}` line.

## 4. AI-generated images
Image source: **Pollinations.ai** — free, unauthenticated, no API key: `GET https://image.pollinations.ai/prompt/{encodeURIComponent(imagePrompt)}?width=1024&height=536&nologo=true&seed={articleId}`. The `seed` (article id, or digest date+type) makes regeneration idempotent — same story always yields the same image.

Per-platform embedding, added to `social.ts`:
- **Bluesky** (`postToBluesky`, `opts.imageUrl`): fetch the image bytes, `POST .../com.atproto.repo.uploadBlob` (authenticated, `Content-Type` matching the fetched image), then set `record.embed = { $type: 'app.bsky.embed.images', images: [{ image: blobRef, alt: <the article/digest title, truncated if needed> }] }`. Bluesky caps images at ~1MB; if the fetch or upload fails for any reason, catch it and post the text-only record — never block the text post on the image.
- **Threads** (`postToThreads`, `opts.imageUrl`): Threads accepts a remote URL directly — set `media_type: 'IMAGE', image_url: opts.imageUrl` instead of `media_type: 'TEXT'` when creating the container; `text` is still passed as the caption. No upload step needed.
- **Telegram**: Telegram photo captions are capped at 1024 characters, well under the existing full HTML bulletin (`intelMessage`), so the existing `sendMessage` call is left completely untouched. Instead, a new `sendPhoto` call is added *before* it — `photo: imageUrl, caption: <escaped title>` — so the channel shows image+title followed by the existing full analysis message. `digest.ts` gets the equivalent extra `sendPhoto` call ahead of its existing digest message, with a short caption like `📢 {type} Geopolitical Digest`.

`digest.ts`'s Groq prompt also gains `imagePrompt`, describing a general "roundup" visual (it summarizes ~10 stories, not one).

## 5. More frequent, plan-independent posting
Vercel's Hobby plan limits each cron job to once/day; the user isn't upgrading to Pro. New `.github/workflows/social-poll.yml`:
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
Runs every 4 hours (6x/day); `workflow_dispatch` allows manual runs from the GitHub Actions UI for testing. `/api/poll` itself needs no code changes to support this — it already no-ops safely ("skipped") when there's nothing new to post, so running it more often just means it posts sooner after something new appears, rather than waiting up to 24 hours. `vercel.json`'s `/api/poll` cron entry is removed to avoid double-triggering; the two `digest` cron entries are untouched.

## New env vars
None. Pollinations needs no key; no new credentials for any platform.

## Error handling
Unchanged philosophy from the existing pipeline: every network call that isn't essential to the core post (image fetch, blob upload, facet computation) is wrapped so a failure degrades gracefully to a plain text post rather than blocking or throwing. No retries anywhere — for `poll.ts`/`digest.ts` the next run (now every 4 hours instead of daily) naturally supersedes a missed post; for the GitHub Actions workflow, a failed run just shows red in the Actions tab and the next scheduled run tries again.

## Testing
No test framework in this repo (unchanged). Manual verification:
1. `GET /api/poll?force=1` — confirm the Bluesky post shows a clickable link, an image, and hook/hashtags within budget; confirm the Threads post shows the image; confirm Telegram shows an image+title message followed by the existing full analysis message unchanged.
2. `GET /api/digest` — same checks for the digest flow.
3. Manually run the new GitHub Actions workflow via `workflow_dispatch` to confirm the curl reaches the live endpoint successfully before relying on the 4-hour schedule.
