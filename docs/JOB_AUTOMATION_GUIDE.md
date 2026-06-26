# Job Finder Automation Guide

This is a Next.js-only job automation app using Neon Postgres, Prisma, Gemini, Brevo, Tailwind, shadcn-style UI primitives, TanStack Table, and Vercel Cron.

## Workflow

1. Vercel Cron calls `/api/cron/morning`.
2. Source connectors fetch public job listings from eight platforms.
3. Jobs are normalized, deduped, and ranked by a local heuristic.
4. The top candidates are scored against your resume by Gemini (key rotation).
5. Every job is upserted into Neon Postgres; jobs scoring `>= 85` are kept as strong matches.
6. Matched jobs can be exported from `/api/export/jobs`.
7. Brevo sends a daily email summary when configured.

## Local Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open the app at:

```txt
http://localhost:3000
```

Trigger the cron route locally:

```txt
http://localhost:3000/api/cron/morning?secret=your-cron-secret
```

Export CSV:

```txt
http://localhost:3000/api/export/jobs
```

## Neon Setup

Create a Neon project, then copy the Postgres connection string.

Use the pooled connection string for `DATABASE_URL` when deploying serverless. Use the direct connection string for `DIRECT_URL` if Neon gives you one. If you only have one Neon URL for now, put the same URL in both variables.

After `.env` is ready, run:

```bash
npm run prisma:migrate
```

Use migration name:

```txt
init_job_finder
```

## Gemini Setup

Create a Gemini API key from Google AI Studio and place it in:

```env
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-key"
```

The app uses Gemini for scoring, cover letter generation, and resume variant generation. If the key is missing, the app falls back to a simple local heuristic score so the dashboard can still run during development.

## Brevo Setup

Create a Brevo transactional email API key and place it in:

```env
BREVO_API_KEY="your-brevo-api-key"
BREVO_EMAIL_FROM="verified-sender@yourdomain.com"
BREVO_EMAIL_FROM_NAME="Job Finder"
BREVO_EMAIL_TO="your-email@example.com"
```

The sender email must be verified in Brevo.

## Deployment

Deploy to Vercel and add all environment variables from `docs/ENV_REQUIRED.md`.

`vercel.json` contains the daily cron schedule:

```json
{
  "path": "/api/cron/morning",
  "schedule": "0 4 * * *"
}
```

This runs at `04:00 UTC`. Change it if you want a different morning time.

## Source Connectors

`src/lib/jobs/sources.ts` queries eight sources per run. Edit the CONFIG lists at
the top of that file (search terms, company board slugs, RSS categories, LinkedIn
queries) to change where the morning job hunts.

| Source | Type | Notes |
|---|---|---|
| RemoteOK | Public JSON API | Latest ~100 site-wide; needs a User-Agent header |
| Remotive | Public JSON API | Keyword search per `SEARCH_TERMS` |
| Arbeitnow | Public JSON API | Remote-only listings |
| Greenhouse | Public board API | One call per slug in `GREENHOUSE_BOARDS` |
| Lever | Public posting API | One call per slug in `LEVER_COMPANIES` |
| Ashby | Public job-board API | One call per slug in `ASHBY_BOARDS` |
| We Work Remotely | Public RSS | Parsed with cheerio (`WWR_FEEDS`) |
| LinkedIn | Guest search endpoint | **Best-effort only** — see below |

Every connector is fail-soft: a blocked or failing source resolves to an empty
list and the run continues. Results are deduped by normalized URL and filtered
by a stack-relevance regex before scoring.

### LinkedIn caveat

The LinkedIn connector uses the public guest job-search endpoint (no login). It
works from a **residential IP** (your machine, `npm run jobs:run`) and from
**GitHub Actions**, but LinkedIn rate-limits/blocks datacenter IPs, so it will
usually return nothing when run from **Vercel's serverless cron**. That is
expected and silent by design. To actually harvest LinkedIn daily, run the
morning job from GitHub Actions (or any residential/proxy runner) instead of, or
in addition to, the Vercel cron. Keep this for personal job discovery, not bulk
scraping.

### Daily run via GitHub Actions

`.github/workflows/morning.yml` runs the full pipeline daily at 04:00 UTC
(09:00 PKT) and can be triggered by hand from the **Actions** tab. It runs on a
Windows runner to match the win32-pinned dependencies in `package.json`, and is
the recommended way to make the LinkedIn connector actually harvest (Vercel's
cron cannot reach LinkedIn).

Add these as repository secrets (**Settings → Secrets and variables → Actions**):

```txt
DATABASE_URL
DIRECT_URL
GOOGLE_GENERATIVE_AI_API_KEY1   (plus 2, 3, 4 if you have them)
RESUME_TEXT
BREVO_API_KEY
BREVO_EMAIL_FROM
BREVO_EMAIL_FROM_NAME
BREVO_EMAIL_TO
```

`CRON_SECRET` is not needed here — the workflow calls `npm run jobs:run`
directly, bypassing the protected cron route.

### Scoring budget

With eight sources a run can surface hundreds of jobs. To stay inside Vercel's
300s limit and the Gemini quota, `workflow.ts` ranks every job with the cheap
local heuristic first and sends only the top `GEMINI_TOP_CANDIDATES` (default 40)
to Gemini. Raise that constant if you move scraping to a longer-lived runner.

Avoid aggressive scraping on Otta, Workday, and other protected sites. Prefer
public APIs, RSS feeds, and public company job boards. If Playwright scraping
becomes heavy, run it on Railway, Render, Fly.io, Trigger.dev, or GitHub Actions
and keep the Next.js app as the dashboard/API.

## Production Notes

- Postgres is the source of truth.
- CSV is export only, not storage.
- `CronRun` records every automation run.
- `CRON_SECRET` protects the cron route.
- Add Upstash QStash later if scraping/scoring becomes too slow for one cron request.
