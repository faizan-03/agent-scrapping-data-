export type ScrapedJob = {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  source: string;
  description?: string | null;
  salary?: string | null;
  postedAt?: Date | null;
};

type RemoteOkJob = {
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
};

async function fetchRemoteOk(): Promise<ScrapedJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "job-finder/0.1" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`RemoteOK failed with ${response.status}`);
  }

  const data = (await response.json()) as RemoteOkJob[];

  return data
    .filter((job) => job.position && job.company && job.url)
    .slice(0, 80)
    .map((job) => ({
      title: job.position!,
      company: job.company!,
      location: job.location ?? "Remote",
      url: job.url!,
      source: "RemoteOK",
      description: job.description ?? null,
      salary:
        job.salary_min || job.salary_max
          ? `${job.salary_min ?? "?"}-${job.salary_max ?? "?"}`
          : null,
      postedAt: job.date ? new Date(job.date) : null,
    }));
}

async function fetchGreenhouseBoard(companySlug: string): Promise<ScrapedJob[]> {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    jobs?: Array<{
      title?: string;
      absolute_url?: string;
      location?: { name?: string };
      content?: string;
      updated_at?: string;
    }>;
  };

  return (data.jobs ?? [])
    .filter((job) => job.title && job.absolute_url)
    .map((job) => ({
      title: job.title!,
      company: companySlug,
      location: job.location?.name ?? null,
      url: job.absolute_url!,
      source: "Greenhouse",
      description: job.content ?? null,
      postedAt: job.updated_at ? new Date(job.updated_at) : null,
    }));
}

export async function scrapeConfiguredSources() {
  const jobs = await Promise.allSettled([
    fetchRemoteOk(),
    fetchGreenhouseBoard("airbnb"),
    fetchGreenhouseBoard("stripe"),
  ]);

  return jobs.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export const plannedSources = [
  "LinkedIn",
  "RemoteOK",
  "Wellfound",
  "Greenhouse",
  "Lever",
  "Ashby",
  "Workable",
  "Workday",
  "Otta",
  "Company career pages",
];
