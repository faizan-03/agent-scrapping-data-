import { prisma } from "@/lib/prisma";
import { scrapeConfiguredSources, plannedSources } from "./sources";
import { matchJob } from "./matching";
import { sendRunEmail } from "./email";

export async function runMorningJob() {
  const run = await prisma.cronRun.create({
    data: {
      status: "RUNNING",
      sources: plannedSources,
    },
  });

  try {
    const scrapedJobs = await scrapeConfiguredSources();
    let matchedCount = 0;

    for (const job of scrapedJobs) {
      const match = await matchJob(job);

      if (match.score < 85) {
        await prisma.job.upsert({
          where: { url: job.url },
          create: { ...job, score: match.score, status: "NEW" },
          update: { ...job, score: match.score },
        });
        continue;
      }

      matchedCount += 1;
      await prisma.job.upsert({
        where: { url: job.url },
        create: {
          ...job,
          score: match.score,
          status: "MATCHED",
          coverLetter: match.coverLetter,
          resumeVariant: match.resumeVariant,
        },
        update: {
          ...job,
          score: match.score,
          status: "MATCHED",
          coverLetter: match.coverLetter,
          resumeVariant: match.resumeVariant,
        },
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
