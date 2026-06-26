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
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-studio-gemini-api-key"
RESUME_TEXT="paste your complete resume text here"
```

`RESUME_TEXT` is used to score each job and generate the cover letter/resume variant.

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
