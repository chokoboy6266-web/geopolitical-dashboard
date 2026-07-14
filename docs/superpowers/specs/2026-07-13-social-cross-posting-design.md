# Social Cross-Posting: Bluesky & Threads — Design

## Purpose
Extend the existing Telegram auto-posting (`api/poll.ts`, `api/digest.ts`) to also publish to Bluesky and Threads, so every breaking-news bulletin and twice-daily digest reaches all three channels with no manual step.

## Scope
- In scope: posting breaking alerts (poll.ts) and digests (digest.ts) to Bluesky and Threads.
- Out of scope: approval workflows, analytics/tracking of cross-posts, the brand/monetization landing page (separate design), replacing the `twitter-api-v2` dependency (unused, left alone).

## Architecture
New shared module `api/_lib/social.ts` exports:
- `postToBluesky(text: string): Promise<void>`
- `postToThreads(text: string): Promise<void>`

Both `poll.ts` and `digest.ts` call Telegram + Bluesky + Threads via `Promise.allSettled` in the same request — one platform failing (rate limit, bad token, outage) never blocks the others or throws. Each function no-ops silently if its env vars aren't set yet, so the feature activates automatically once credentials are added — no code changes needed at that point.

## Platform mechanics
**Bluesky (AT Protocol)** — plain `fetch`, no SDK:
1. `POST https://bsky.social/xrpc/com.atproto.server.createSession` with `{ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD }` → returns `accessJwt`, `did`.
2. `POST https://bsky.social/xrpc/com.atproto.repo.createRecord` with the record `{ repo: did, collection: 'app.bsky.feed.post', record: { text, createdAt, $type: 'app.bsky.feed.post' } }`, authenticated with the JWT.
3. 300-character limit — truncate with an ellipsis + link if needed.

**Threads (Meta Graph API)** — plain `fetch`, no SDK:
1. `POST https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads` with `{ media_type: 'TEXT', text, access_token }` → returns a creation id.
2. `POST https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads_publish` with `{ creation_id, access_token }`.
3. 500-character limit.

## Content
Reuse the existing short-pitch style already built for the X/WhatsApp share buttons in `poll.ts` (title + link), trimmed per-platform to the two limits above — not the full HTML bulletin sent to Telegram.

## New env vars
`BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`.

## Error handling
Each platform call is wrapped independently; failures are logged via `console.error` and swallowed, matching the existing tolerance pattern in `poll.ts`/`digest.ts` (e.g. Gemini fallback text). No retries — the next cron run supersedes a missed post.

## Account setup (manual, one-time, done by the user)
1. Create a Bluesky account at bsky.app as `indiaworldintel.bsky.social`; generate an app password under Settings → App Passwords.
2. Create a Threads account as `@indiaworldintel` (via Instagram signup); create a Meta Developer app, add the Threads API product, add the account as a tester, generate a long-lived access token, and get the numeric Threads user id.
3. Add all four values as Vercel environment variables.

## Testing
No unit test framework exists in this repo. Verification is manual: trigger `poll.ts`/`digest.ts` with `?force=1` against a test Bluesky/Threads account (or check console logs when env vars are absent, confirming silent no-op) before pointing at the real brand accounts.
