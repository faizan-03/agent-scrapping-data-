import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import type { ScrapedJob } from "./sources";

const matchSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  coverLetter: z.string(),
  resumeVariant: z.string(),
});

const DEFAULT_RESUME_KEYWORDS =
  "typescript react nextjs nestjs node express fastapi python postgres mongodb supabase ai rag llm automation full stack backend frontend";

/**
 * Collect every configured Gemini key. The user keeps numbered keys
 * (GOOGLE_GENERATIVE_AI_API_KEY1..4) for rotation; we also accept the
 * unnumbered default if present. Order defines rotation priority.
 */
export function geminiKeys(): string[] {
  return [
    env.GOOGLE_GENERATIVE_AI_API_KEY,
    env.GOOGLE_GENERATIVE_AI_API_KEY1,
    env.GOOGLE_GENERATIVE_AI_API_KEY2,
    env.GOOGLE_GENERATIVE_AI_API_KEY3,
    env.GOOGLE_GENERATIVE_AI_API_KEY4,
  ].filter((key): key is string => Boolean(key && key.trim()));
}

/**
 * Cheap local relevance score (0-100). No API call. Used to rank every
 * scraped job so only the strongest candidates are sent to Gemini.
 */
export function heuristicScore(job: ScrapedJob, resumeText: string) {
  const haystack = `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();
  const words = (resumeText || DEFAULT_RESUME_KEYWORDS)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 3);
  const uniqueWords = Array.from(new Set(words)).slice(0, 120);
  const hits = uniqueWords.filter((word) => haystack.includes(word)).length;
  return Math.min(100, Math.round((hits / Math.max(uniqueWords.length, 1)) * 140));
}

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|quota|rate.?limit|resource.?exhausted/i.test(message);
}

export type GeminiScore = {
  score: number;
  coverLetter: string | null;
  resumeVariant: string | null;
};

/**
 * Score a single job against the resume with Gemini. Returns null when no
 * key/resume is configured or every key fails, so the caller can fall back
 * to the heuristic score. Rotates to the next key only on quota errors.
 */
export async function scoreJobWithGemini(
  job: ScrapedJob,
  resumeText: string,
): Promise<GeminiScore | null> {
  const keys = geminiKeys();
  if (!keys.length || !resumeText) return null;

  for (let index = 0; index < keys.length; index++) {
    const provider = createGoogleGenerativeAI({ apiKey: keys[index] });

    try {
      const result = await generateObject({
        model: provider("gemini-2.0-flash"),
        schema: matchSchema,
        prompt: [
          "Score this job against the resume from 0-100.",
          "Return a concise cover letter and resume variant only if score is 85 or higher.",
          "Prefer practical evidence: title fit, required skills, seniority, location, and domain match.",
          "Penalize roles that exclude the candidate's region or demand far more seniority than the resume shows.",
          `Resume:\n${resumeText}`,
          `Job:\n${JSON.stringify(job)}`,
        ].join("\n\n"),
      });

      const score = Math.round(result.object.score);
      return {
        score,
        coverLetter: score >= 85 ? result.object.coverLetter : null,
        resumeVariant: score >= 85 ? result.object.resumeVariant : null,
      };
    } catch (error) {
      if (isQuotaError(error) && index < keys.length - 1) {
        console.warn(`Gemini key #${index + 1} hit quota; rotating to next key.`);
        continue;
      }
      console.warn(
        `Gemini scoring failed for ${job.url}; falling back to heuristic.`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  return null;
}
