import { BriefcaseBusiness, Database, Download, Play, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobsTable } from "@/components/jobs/jobs-table";
import type { DashboardMetrics, JobRow } from "@/types/jobs";

export const dynamic = "force-dynamic";

async function getDashboardData(): Promise<{ jobs: JobRow[]; metrics: DashboardMetrics }> {
  const [jobs, totalJobs, matchedJobs, exportedJobs, lastRun] = await Promise.all([
    prisma.job.findMany({
      orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
      take: 300,
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
    }),
    prisma.job.count(),
    prisma.job.count({ where: { score: { gte: 85 } } }),
    prisma.job.count({ where: { status: "EXPORTED" } }),
    prisma.cronRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      ...job,
      discoveredAt: job.discoveredAt.toISOString(),
    })),
    metrics: {
      totalJobs,
      matchedJobs,
      exportedJobs,
      lastRun: lastRun
        ? {
            status: lastRun.status,
            startedAt: lastRun.startedAt.toISOString(),
            scrapedCount: lastRun.scrapedCount,
            matchedCount: lastRun.matchedCount,
          }
        : null,
    },
  };
}

export default async function Home() {
  const { jobs, metrics } = await getDashboardData();

  return (
    <main className="min-h-screen">
      <section className="border-b border-[#dfe4dc] bg-[#f7f8f5]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="success">Next.js + Neon + Prisma</Badge>
                <Badge>Daily automation</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-normal text-[#17211b] sm:text-5xl">
                Job Finder
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#657069]">
                A deployable dashboard for scraping job sources, scoring roles against your resume,
                keeping strong matches, exporting CSV, and sending an email digest.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/api/cron/morning" target="_blank" rel="noreferrer">
                <Button>
                  <Play size={16} />
                  Run
                </Button>
              </a>
              <a href="/api/export/jobs">
                <Button variant="secondary">
                  <Download size={16} />
                  CSV
                </Button>
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Database size={18} />} label="Stored jobs" value={metrics.totalJobs} />
            <Metric icon={<Radar size={18} />} label="85%+ matches" value={metrics.matchedJobs} />
            <Metric icon={<Download size={18} />} label="Exported" value={metrics.exportedJobs} />
            <Metric
              icon={<BriefcaseBusiness size={18} />}
              label="Last run"
              value={metrics.lastRun ? metrics.lastRun.status : "None"}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <JobsTable jobs={jobs} />
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#eef4ee] text-[#176b5b]">
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#17211b]">{value}</div>
      <div className="text-sm text-[#657069]">{label}</div>
    </div>
  );
}
