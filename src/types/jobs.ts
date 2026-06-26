export type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  source: string;
  url: string;
  score: number | null;
  status: string;
  recruiterEmail: string | null;
  discoveredAt: string;
};

export type DashboardMetrics = {
  totalJobs: number;
  matchedJobs: number;
  exportedJobs: number;
  lastRun: {
    status: string;
    startedAt: string;
    scrapedCount: number;
    matchedCount: number;
  } | null;
};
