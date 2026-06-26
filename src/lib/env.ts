import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  APP_BASE_URL: z.string().url().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY1: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY2: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY3: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY4: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  RESUME_TEXT: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_EMAIL_FROM: z.string().email().optional(),
  BREVO_EMAIL_FROM_NAME: z.string().optional(),
  BREVO_EMAIL_TO: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
