import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
    take: 500,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      source: true,
      url: true,
      score: true,
      status: true,
      recruiterEmail: true,
      discoveredAt: true,
    },
  });

  return NextResponse.json(
    jobs.map((job) => ({
      ...job,
      discoveredAt: job.discoveredAt.toISOString(),
    })),
  );
}
