import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function sendRunEmail(runId: string) {
  if (!env.BREVO_API_KEY || !env.BREVO_EMAIL_FROM || !env.BREVO_EMAIL_TO) {
    return;
  }

  const run = await prisma.cronRun.findUnique({ where: { id: runId } });
  const jobs = await prisma.job.findMany({
    where: { score: { gte: 85 } },
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
    take: 25,
  });

  if (!run) return;

  const htmlContent = [
    `<p>Scraped ${run.scrapedCount} jobs and found ${run.matchedCount} matches at 85% or higher.</p>`,
    "<ul>",
    ...jobs.map(
      (job) =>
        `<li><strong>${job.score}%</strong> - <a href="${job.url}">${job.title}</a> at ${job.company}</li>`,
    ),
    "</ul>",
  ].join("");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: env.BREVO_EMAIL_FROM,
        name: env.BREVO_EMAIL_FROM_NAME ?? "Job Finder",
      },
      to: [{ email: env.BREVO_EMAIL_TO }],
      subject: `Job Finder: ${run.matchedCount} strong matches`,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email failed: ${response.status} ${message}`);
  }
}
