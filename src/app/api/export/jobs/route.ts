import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: { score: { gte: 85 } },
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
  });

  const csv = Papa.unparse(
    jobs.map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      score: job.score,
      recruiterEmail: job.recruiterEmail,
      url: job.url,
      status: job.status,
      discoveredAt: job.discoveredAt.toISOString(),
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="matched-jobs.csv"',
    },
  });
}
