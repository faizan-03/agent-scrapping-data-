# Required Environment Variables

Create a `.env` file in the project root with these values.

## Neon Postgres

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/job_finder?sslmode=require"
DIRECT_URL="postgresql://user:password@host.neon.tech/job_finder?sslmode=require"
```

Use Neon connection strings. If you only have one URL right now, use the same URL for both.

## Cron

```env
CRON_SECRET="make-this-a-long-random-secret-at-least-16-chars"
APP_BASE_URL="http://localhost:3000"
```

For Vercel production, set `APP_BASE_URL` to your deployed domain.

## Gemini

```env
# Provide at least one key. Numbered keys are rotated when one hits its quota.
GOOGLE_GENERATIVE_AI_API_KEY1="your-google-ai-studio-gemini-api-key"
GOOGLE_GENERATIVE_AI_API_KEY2=""
GOOGLE_GENERATIVE_AI_API_KEY3=""
GOOGLE_GENERATIVE_AI_API_KEY4=""
# The unnumbered key is also accepted if you prefer a single key:
# GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-key"
RESUME_TEXT="paste your complete resume text here"
```

`RESUME_TEXT` is used to score jobs and generate the cover letter/resume variant.
The morning job ranks all scraped jobs with a local heuristic and sends only the
top candidates to Gemini, rotating across the numbered keys on quota errors. If
no key (or no resume) is set, scoring falls back to the heuristic alone.

## Brevo

```env
BREVO_API_KEY="your-brevo-transactional-email-api-key"
BREVO_EMAIL_FROM="verified-sender@yourdomain.com"
BREVO_EMAIL_FROM_NAME="Job Finder"
BREVO_EMAIL_TO="your-email@example.com"
```

`BREVO_EMAIL_FROM` must be a sender that Brevo allows you to send from.

## Minimal Local Development

To only build and view the UI, you can start with placeholder Neon values. To run migrations, cron, scraping, and dashboard DB reads, you need real Neon values.
