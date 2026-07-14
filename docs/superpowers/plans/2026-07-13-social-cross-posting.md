# Social Cross-Posting (Bluesky & Threads) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Telegram bulletin (`api/poll.ts`) and digest (`api/digest.ts`) also gets posted to Bluesky and Threads, automatically, with no approval step.

**Architecture:** A new shared module, `api/_lib/social.ts`, exports `postToBluesky(text)` and `postToThreads(text)`. Both use plain `fetch` (no SDK) against the AT Protocol and Meta Graph API respectively. `poll.ts` and `digest.ts` call all three platforms (Telegram + the two new ones) via `Promise.allSettled` so one platform failing never blocks the others.

**Tech Stack:** TypeScript (Vercel serverless functions, `@ts-nocheck` per existing convention in `api/`), plain `fetch`, no new npm dependencies.

## Global Constraints

- No test framework exists in this repo (`api/*.ts` files use `// @ts-nocheck` and have never been unit-tested — see `api/poll.ts:1`, `api/digest.ts:1`). Do **not** add jest/vitest/etc. Verification in this plan uses ad-hoc `node` scripts with the built-in `assert` module (run via Bash, not committed) plus `npx tsc --noEmit` for a syntax check — this matches how the codebase already gets verified (see `walkthrough.md`'s "Local Dev Verification" section).
- Any file under `api/` becomes a live Vercel route except paths starting with `_` — this is why the shared module must live at `api/_lib/social.ts`, not `api/social.ts`.
- Match existing style: plain `fetch`, `// @ts-nocheck` at the top of each file, `console.error` + swallow on failure (see `api/poll.ts:69-72`).
- New env vars: `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`. Until these are set in Vercel, both functions must no-op silently (no throws, no console spam) — the feature activates automatically once credentials are added, no further code changes needed.
- Bluesky posts truncate to 300 characters; Threads posts truncate to 500 characters.

---

### Task 1: Shared social-posting module

**Files:**
- Create: `api/_lib/social.ts`

**Interfaces:**
- Produces: `postToBluesky(text: string): Promise<void>`, `postToThreads(text: string): Promise<void>` — both swallow all errors internally and never throw; both no-op immediately if their env vars are unset.

- [ ] **Step 1: Write `api/_lib/social.ts`**

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

export async function postToBluesky(text: string): Promise<void> {
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) return;
  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD })
    });
    const session = await sessionRes.json();
    if (!session.accessJwt) throw new Error(session.message || 'Bluesky login failed');

    const record = {
      $type: 'app.bsky.feed.post',
      text: truncate(text, 300),
      createdAt: new Date().toISOString()
    };

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

export async function postToThreads(text: string): Promise<void> {
  if (!THREADS_ACCESS_TOKEN || !THREADS_USER_ID) return;
  try {
    const createRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: truncate(text, 500),
        access_token: THREADS_ACCESS_TOKEN
      })
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

- [ ] **Step 2: Verify silent no-op when env vars are unset**

Run this exactly as written (it stubs `fetch` so no network call happens, then confirms neither function throws and neither calls `fetch`):

```bash
npx tsc api/_lib/social.ts --module commonjs --target es2019 --esModuleInterop --outDir .verify-tmp
node -e "
const assert = require('assert');
let fetchCalls = 0;
global.fetch = async () => { fetchCalls++; return { ok: true, json: async () => ({}) }; };
delete process.env.BLUESKY_HANDLE;
delete process.env.BLUESKY_APP_PASSWORD;
delete process.env.THREADS_ACCESS_TOKEN;
delete process.env.THREADS_USER_ID;
const { postToBluesky, postToThreads } = require('./.verify-tmp/social.js');
(async () => {
  await postToBluesky('test');
  await postToThreads('test');
  assert.strictEqual(fetchCalls, 0, 'expected zero fetch calls when env vars are unset');
  console.log('PASS: no-op confirmed');
})();
"
```

Expected output: `PASS: no-op confirmed`

- [ ] **Step 3: Verify request shape when env vars ARE set**

```bash
node -e "
const assert = require('assert');
process.env.BLUESKY_HANDLE = 'test.bsky.social';
process.env.BLUESKY_APP_PASSWORD = 'abcd-1234';
process.env.THREADS_ACCESS_TOKEN = 'fake-token';
process.env.THREADS_USER_ID = '12345';
const calls = [];
global.fetch = async (url, opts) => {
  calls.push({ url, body: opts.body ? JSON.parse(opts.body) : null });
  if (url.includes('createSession')) return { ok: true, json: async () => ({ accessJwt: 'jwt', did: 'did:plc:test' }) };
  if (url.includes('createRecord')) return { ok: true, json: async () => ({ uri: 'at://test' }) };
  if (url.includes('/threads') && !url.includes('publish')) return { ok: true, json: async () => ({ id: 'container-1' }) };
  if (url.includes('threads_publish')) return { ok: true, json: async () => ({ id: 'published-1' }) };
  return { ok: true, json: async () => ({}) };
};
const { postToBluesky, postToThreads } = require('./.verify-tmp/social.js');
(async () => {
  await postToBluesky('a'.repeat(400));
  assert.strictEqual(calls[0].url, 'https://bsky.social/xrpc/com.atproto.server.createSession');
  assert.strictEqual(calls[1].url, 'https://bsky.social/xrpc/com.atproto.repo.createRecord');
  assert.strictEqual(calls[1].body.record.text.length, 300, 'bluesky text should truncate to 300 chars');
  assert.strictEqual(calls[1].body.repo, 'did:plc:test');

  calls.length = 0;
  await postToThreads('b'.repeat(600));
  assert.strictEqual(calls[0].url, 'https://graph.threads.net/v1.0/12345/threads');
  assert.strictEqual(calls[0].body.text.length, 500, 'threads text should truncate to 500 chars');
  assert.strictEqual(calls[1].url, 'https://graph.threads.net/v1.0/12345/threads_publish');
  assert.strictEqual(calls[1].body.creation_id, 'container-1');

  console.log('PASS: request shapes correct');
})();
"
rm -rf .verify-tmp
```

Expected output: `PASS: request shapes correct`

- [ ] **Step 4: Commit**

```bash
git add api/_lib/social.ts
git commit -m "feat: add Bluesky and Threads posting module"
```

---

### Task 2: Wire cross-posting into `api/poll.ts`

**Files:**
- Modify: `api/poll.ts:1-4` (imports), `api/poll.ts:244-268` (after the Telegram send)

**Interfaces:**
- Consumes: `postToBluesky(text: string): Promise<void>`, `postToThreads(text: string): Promise<void>` from `api/_lib/social.ts` (Task 1).

- [ ] **Step 1: Add the import**

In `api/poll.ts`, after line 1 (`// @ts-nocheck`), add:

```ts
import { postToBluesky, postToThreads } from './_lib/social';
```

- [ ] **Step 2: Call both platforms after the Telegram send**

In `api/poll.ts`, immediately after the existing Telegram `fetch` call block (currently ending around line 268 with `});`), insert:

```ts
    const socialPitch = `🚨 ${selectedNews.title}\n\n${webArticleLink}`;
    await Promise.allSettled([
      postToBluesky(socialPitch),
      postToThreads(socialPitch)
    ]);
```

This runs right before the existing `// Update Persistent State` comment, using the `webArticleLink` and `selectedNews` variables already in scope at that point in the function.

- [ ] **Step 3: Syntax-check the file**

```bash
npx tsc --noEmit --target es2020 --module esnext --moduleResolution node --esModuleInterop api/_lib/social.ts api/poll.ts
```

Expected: no output (clean exit). `@ts-nocheck` suppresses type errors, so this only catches parse/syntax mistakes (e.g. mismatched braces, bad import path).

- [ ] **Step 4: Commit**

```bash
git add api/poll.ts
git commit -m "feat: cross-post breaking alerts to Bluesky and Threads"
```

---

### Task 3: Wire cross-posting into `api/digest.ts`

**Files:**
- Modify: `api/digest.ts:1-4` (imports), `api/digest.ts:100-119` (after the Telegram send)

**Interfaces:**
- Consumes: same `postToBluesky`/`postToThreads` as Task 2.

- [ ] **Step 1: Add the import**

In `api/digest.ts`, after line 1 (`// @ts-nocheck`), add:

```ts
import { postToBluesky, postToThreads } from './_lib/social';
```

- [ ] **Step 2: Call both platforms after the Telegram send**

In `api/digest.ts`, immediately after the existing `const telData = await telResponse.json();` line, insert:

```ts
    const socialPitch = `📢 ${type} Geopolitical Intelligence Digest is live — top developments in India & global strategy.\n\nFull briefing: https://t.me/IndiaWorldIntel`;
    await Promise.allSettled([
      postToBluesky(socialPitch),
      postToThreads(socialPitch)
    ]);
```

- [ ] **Step 3: Syntax-check the file**

```bash
npx tsc --noEmit --target es2020 --module esnext --moduleResolution node --esModuleInterop api/_lib/social.ts api/digest.ts
```

Expected: no output (clean exit).

- [ ] **Step 4: Commit**

```bash
git add api/digest.ts
git commit -m "feat: cross-post digests to Bluesky and Threads"
```

---

### Task 4: Document the new env vars

**Files:**
- Modify: `walkthrough.md` (the "Environment Configuration" `.env` block, currently listing `TELEGRAM_TOKEN`, `GEMINI_API_KEY`, `Github`)

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Add the four new vars to the `.env` example block in `walkthrough.md`**

Add these four lines inside the existing ```env fenced block:

```env
BLUESKY_HANDLE=your_bluesky_handle.bsky.social
BLUESKY_APP_PASSWORD=your_bluesky_app_password
THREADS_ACCESS_TOKEN=your_threads_long_lived_token
THREADS_USER_ID=your_threads_numeric_user_id
```

- [ ] **Step 2: Commit**

```bash
git add walkthrough.md
git commit -m "docs: document Bluesky and Threads env vars"
```

## Post-plan manual step (not automatable)

Once all four tasks are committed and deployed, the user must:
1. Create the Bluesky and Threads accounts (see the design doc's "Account setup" section).
2. Add the four env vars to the Vercel project settings.
3. Trigger `/api/poll?force=1` once and check the Bluesky/Threads accounts for the test post, then check Vercel's function logs for any `Bluesky Error:` / `Threads Error:` lines.
