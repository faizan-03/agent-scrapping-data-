import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { scrapeConfiguredSources, plannedSources } from "./sources";
import { heuristicScore, scoreJobWithGemini, geminiKeys } from "./matching";
import { sendRunEmail } from "./email";

/**
 * Cap on how many jobs get an expensive Gemini call per run. Everything is
 * cheaply ranked by the local heuristic first; only the strongest candidates
 * are sent to Gemini so we stay inside Vercel's 300s budget and the API quota.
 */
const GEMINI_TOP_CANDIDATES = 40;

export async function runMorningJob() {
  const run = await prisma.cronRun.create({
    data: {
      status: "RUNNING",
      sources: plannedSources,
    },
  });

  try {
    const scrapedJobs = await scrapeConfiguredSources();
    const resumeText = env.RESUME_TEXT ?? "";
    const useGemini = geminiKeys().length > 0 && Boolean(resumeText);

    // Rank cheaply, then only the top N earn a Gemini call.
    const ranked = scrapedJobs
      .map((job) => ({ job, heuristic: heuristicScore(job, resumeText) }))
      .sort((a, b) => b.heuristic - a.heuristic);

    let matchedCount = 0;

    for (let index = 0; index < ranked.length; index++) {
      const { job, heuristic } = ranked[index];
      let score = heuristic;
      let coverLetter: string | null = null;
      let resumeVariant: string | null = null;

      if (useGemini && index < GEMINI_TOP_CANDIDATES) {
        const gemini = await scoreJobWithGemini(job, resumeText);
        if (gemini) {
          score = gemini.score;
          coverLetter = gemini.coverLetter;
          resumeVariant = gemini.resumeVariant;
        }
      }

      const status = score >= 85 ? "MATCHED" : "NEW";
      if (score >= 85) matchedCount += 1;

      await prisma.job.upsert({
        where: { url: job.url },
        create: { ...job, score, status, coverLetter, resumeVariant },
        update: { ...job, score, status, coverLetter, resumeVariant },
      });
    }

    const finishedRun = await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        scrapedCount: scrapedJobs.length,
        matchedCount,
      },
    });

    await sendRunEmail(finishedRun.id);
    return finishedRun;
  } catch (error) {
    await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
