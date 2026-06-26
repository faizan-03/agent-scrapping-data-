import { google } from "@ai-sdk/google";
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

function heuristicScore(job: ScrapedJob, resumeText: string) {
  const haystack = `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();
  const words = resumeText
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 3);
  const uniqueWords = Array.from(new Set(words)).slice(0, 120);
  const hits = uniqueWords.filter((word) => haystack.includes(word)).length;
  return Math.min(100, Math.round((hits / Math.max(uniqueWords.length, 1)) * 140));
}

function fallbackMatch(job: ScrapedJob, resumeText: string) {
  const score = heuristicScore(
    job,
    resumeText || "typescript react nextjs backend postgres automation",
  );

  return {
    score,
    coverLetter: score >= 85 ? `Draft cover letter for ${job.title} at ${job.company}.` : null,
    resumeVariant: score >= 85 ? `Resume variant focused on ${job.title}.` : null,
  };
}

export async function matchJob(job: ScrapedJob) {
  const resumeText = env.RESUME_TEXT ?? "";

  if (!resumeText || !env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return fallbackMatch(job, resumeText);
  }

  try {
    const result = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: matchSchema,
      prompt: [
        "Score this job against the resume from 0-100.",
        "Return a concise cover letter and resume variant only if score is 85 or higher.",
        "Prefer practical evidence: title fit, required skills, seniority, location, and domain match.",
        `Resume:\n${resumeText}`,
        `Job:\n${JSON.stringify(job)}`,
      ].join("\n\n"),
    });

    return {
      score: Math.round(result.object.score),
      coverLetter: result.object.score >= 85 ? result.object.coverLetter : null,
      resumeVariant: result.object.score >= 85 ? result.object.resumeVariant : null,
    };
  } catch (error) {
    console.warn(
      `Gemini matching failed for ${job.url}; falling back to heuristic scoring.`,
      error instanceof Error ? error.message : error,
    );
    return fallbackMatch(job, resumeText);
  }
}