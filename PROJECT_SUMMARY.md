# Project Summary — Geopolitical Dashboard

Living summary of what this project is, what's been built, and what happened in recent working sessions. Read this first when picking the project back up. For deep technical/architecture detail, see [`walkthrough.md`](walkthrough.md) (note: parts of it are stale — see "Known drift" below). This file replaces an older, out-of-date summary that still described a mocked-data prototype stage the project has long since moved past.

---

## 1. What this is

A React + Vite + TypeScript geopolitical intelligence dashboard (`geopolitical-dashboard-steel.vercel.app`) — a 3D globe visualizing live geopolitical signals, backed by Vercel serverless functions that:
- Pull geopolitics news from Google News RSS across multiple topics
- Run it through an AI analyst persona ("Shivam Punjabi" — realist, India-first lens) via Groq (migrated off Gemini)
- Publish to a Telegram channel (`@IndiaWorldIntel`), Bluesky (`indiaworldintel.bsky.social`), and Threads
- Store the resulting articles/state in the GitHub repo itself (`api/articles.json` etc., committed by bots — hence the many `[skip ci]` commits)

This is a real, live pipeline now — not mocked data. Signal processing, AI analysis, and social posting all run against real APIs and a real deployed instance.

## 2. Architecture at a glance

- **Frontend**: `src/components/Dashboard.tsx` (3D globe via `react-globe.gl`), `ArticlesView.tsx` (strategic library reader), `SidePanel.tsx` (category filters), `SignalCard.tsx` (share-friendly cards).
- **Backend** (`api/`): `poll.ts` (live sweep + post), `digest.ts` (twice-daily roundup), `bulletin.ts`, `approve.ts`, `analyze.ts`, `_lib/news.ts` (shared multi-topic RSS fetch + dedupe + `selectDiverseNews`), `_lib/social.ts` (Bluesky + Threads posting).
- **Automation**: GitHub Actions cron (not Vercel Hobby cron) —
  - `.github/workflows/social-poll.yml` → `/api/poll` every 4 hours
  - `.github/workflows/social-bulletin.yml` → `/api/bulletin` every 6 hours (was every 2 hours — throttled down, see §5)
- **Credentials** (in `.env`, not committed): GitHub PAT, Telegram bot token/chat ID, X (Twitter) consumer/bearer/access keys, Gemini key (legacy), Bluesky handle/app password, Grok key. Values intentionally not repeated here — see `.env` directly.

## 3. Feature history (from git log, ~95 commits, grouped)

1. **Foundation**: initial dashboard, 3D globe, category filters, signal cards.
2. **Telegram intelligence pipeline**: `poll.ts`/`digest.ts` built, Gemini analysis, GitHub-as-database pattern, cron automation, dedup-of-old-news fix.
3. **AI provider migration**: switched analysis engine from Gemini to Groq (`b8ad134`) after a debugging round (temporary diagnostic/dry-run endpoints added then removed).
4. **Social cross-posting** (`docs/superpowers/plans/2026-07-13-social-cross-posting.md`): added Bluesky + Threads posting module, wired into breaking alerts and digests, documented required env vars.
5. **Social posting enhancements** (`docs/superpowers/plans/2026-07-14-social-posting-enhancements.md`): multi-topic RSS via shared `_lib/news.ts`, Bluesky clickable-link facets + image embeds, AI-generated social hooks/image prompts, GitHub Actions 4-hourly trigger replacing Vercel's once-daily cron. **Status: multi-topic news fetch (`fetchNewsItems`/`selectDiverseNews`) is live on `main`.** There's also an active git worktree at `.claude/worktrees/social-posting-enhancements` — check it for any unmerged/divergent work before assuming this plan is fully closed out.
6. **Source quality fixes**: restricted to reputable outlets, fixed source-crowding, diversified sources, globe marker/tooltip redesign with source attribution surfaced in UI (most recent commit, `be07d0b`).

## 4. This session's work: Bluesky account growth

Context: explored getting free real-time updates from analyst accounts on X — concluded **X's free API tier is gone as of Feb 2026** (pay-per-use only, $0.005/read, no viable free path for programmatic access; free embed widgets or RSS-bridge tools like Inoreader/Nitter are the only no-cost alternatives, with reliability caveats).

Pivoted to auditing and improving the project's own Bluesky bot account (`indiaworldintel.bsky.social`):
- **Bio rewritten** to add a link to the live dashboard and a credibility line explaining it's RSS-sourced automation (was previously vague "autonomous intelligence" framing with no link out).
- **Followed 12 curated OSINT accounts** (via the AT Protocol API, not a mass-follow of an entire 99-member starter pack, to avoid looking like bot/spam behavior on a 3-day-old account): Eliot Higgins, Justin Seitz, Troy Hunt, Benjamin Strick, Micah Hoffman, Baptiste Robert, Christina Lekati, Nixintel, The Intel Crab, Henk van Ess, Paul Myers, Lukasz Olejnik.
- **Pruned to 5** after checking actual posting cadence via `app.bsky.feed.getAuthorFeed`: kept Eliot Higgins, Troy Hunt, Lukasz Olejnik, Benjamin Strick, Micah Hoffman (all posting weekly or more, within the last ~8 days). Unfollowed Justin Seitz, Baptiste Robert, Christina Lekati, Nixintel, The Intel Crab, Henk van Ess, Paul Myers — all had gone quiet (last posts ranging from 44 days to 3+ years ago).

Posting-cadence throttling was flagged here as a possible over-posting risk but left undone pending explicit direction — see §5, where it turned out to be a much bigger problem than assumed and got fixed.

## 5. This session's work: Bluesky performance audit & de-spam fixes

Pulled live data straight from Bluesky's public API for `indiaworldintel.bsky.social` (profile + full 558-post history) and cross-referenced it against GitHub Actions run history and the posting code (`poll.ts`, `bulletin.ts`, `digest.ts`, `_lib/social.ts`).

**Findings:**
- The account was posting **~50 times/day** — far more than §4's "~10-12/day" estimate, and even more than the code's own theoretical max (~28-30/day given the actual cron cadence). That ~1.7x gap is unexplained: checked for a second Vercel project link and orphaned/duplicate GitHub workflows, found none. Flagged for the user to check the Vercel dashboard (Cron Jobs / Function logs) directly if post volume doesn't drop to the new expected ~6/day after redeploy.
- 87.3% of posts (487/558) had zero engagement. Totals across all 558 posts: 75 likes, 9 reposts, 1 reply, 0 quotes. Best single post: 3 likes.
- Root causes: (1) spam-tier posting volume actively suppressing discovery and follows, (2) zero two-way engagement — 1 reply received in 558 posts, none made, (3) Bluesky posts were bare `📰 headline + link + hashtags` — the real Groq-generated "Shivam Punjabi" analysis only ever went to Telegram, so Bluesky read exactly like a generic RSS-to-social bot.

**Fixes made** (code changes done; not yet committed/pushed as of this writing — see git status):
- `api/poll.ts`: removed the Bluesky/Threads posting leg entirely (was contributing 6 bare-headline posts/day); Telegram posting unchanged. Removed `shortenUrl`/`getRepresentationalImage`, now-dead code.
- `api/bulletin.ts`: now the sole Bluesky/Threads poster. `MAX_PER_RUN` 2 → 1. Added `getSocialHook()`, a short Groq call producing one punchy analytical sentence per post in place of the bare headline dump.
- `api/digest.ts`: Bluesky pitch now leads with the actual top headline instead of a generic "digest is live" line.
- `.github/workflows/social-bulletin.yml`: cron `0 */2 * * *` → `0 */6 * * *`.
- Net effect: theoretical Bluesky volume ~50/day → ~6/day (bulletin 4/day + digest 2/day), every remaining post carrying real analysis instead of a raw headline.

**Explicitly not done:** automating replies/quote-posts/follows. Reach at 5 followers is a network problem, not a content problem — two-way engagement is the actual growth lever, but automating it risks reading as inauthentic/spam and needs a human doing it deliberately. Left as a manual to-do for the user.

## 6. Known drift / cleanup flags

- **`walkthrough.md` is stale**: still describes Gemini as the AI provider (project runs on Groq now) and doesn't mention the Bluesky/Threads pipeline in its architecture diagram. Worth a refresh if you want a single accurate technical doc.
- **Security: hardcoded secrets in untracked scratch scripts** — `emergency_fix.cjs` and `verify_fix.cjs` at the repo root both contain the live Telegram bot token hardcoded in plaintext. They're currently untracked (not committed, per `git status`), but if they ever get `git add`-ed, that token would leak into history. Recommend deleting these once you confirm they're no longer needed, or at least never committing them.
- **Uncommitted/untracked as of this writing**: `.claude/`, `CLAUDE.md`, `api/test-tel.ts`, `emergency_fix.cjs`, `public/brand/logo-icon-1000.png`, `scratch/`, `verify_fix.cjs` — none of this is lost, just sitting outside version control. Worth a deliberate commit (or `.gitignore` entry for the throwaway scripts) next time you're in the repo.
- **Active worktree**: `worktree-social-posting-enhancements` branch/worktree exists alongside `main` — check whether it still has work to merge or can be cleaned up.
- **Pending push**: the §5 de-spam fixes (`api/poll.ts`, `api/bulletin.ts`, `api/digest.ts`, `.github/workflows/social-bulletin.yml`) are only local changes. GitHub Actions reads cron schedules from the remote default branch and Vercel needs a redeploy — none of §5's effects are live until this is committed and pushed.

## 7. Where to look for more detail

- Full technical architecture: [`walkthrough.md`](walkthrough.md)
- Feature plans/specs: `docs/superpowers/plans/` and `docs/superpowers/specs/`
- Social posting logic: `api/_lib/social.ts`, `api/_lib/news.ts`
- Cron schedules: `.github/workflows/social-poll.yml`, `.github/workflows/social-bulletin.yml`, `vercel.json`
