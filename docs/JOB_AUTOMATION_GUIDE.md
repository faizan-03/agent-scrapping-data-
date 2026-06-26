# Job Finder Automation Guide

This is a Next.js-only job automation app using Neon Postgres, Prisma, Gemini, Brevo, Tailwind, shadcn-style UI primitives, TanStack Table, and Vercel Cron.

## Workflow

1. Vercel Cron calls `/api/cron/morning`.
2. Source connectors fetch public job listings.
3. Jobs are normalized and upserted into Neon Postgres through Prisma.
4. Gemini scores each job against your resume.
5. Jobs with score `>= 85` are kept as strong matches.
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

The first implementation includes public RemoteOK and Greenhouse examples.

Next good connectors:

- Lever public posting APIs
- Ashby public job board JSON
- Greenhouse public boards
- RemoteOK API
- Company career pages

Avoid aggressive scraping on LinkedIn, Otta, Workday, and other protected sites. Prefer public APIs, RSS feeds, public company job boards, or official endpoints. If Playwright scraping becomes heavy, run scraping on Railway, Render, Fly.io, Trigger.dev, or GitHub Actions and keep the Next.js app as the dashboard/API.

## Production Notes

- Postgres is the source of truth.
- CSV is export only, not storage.
- `CronRun` records every automation run.
- `CRON_SECRET` protects the cron route.
- Add Upstash QStash later if scraping/scoring becomes too slow for one cron request.
