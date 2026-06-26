import * as cheerio from "cheerio";

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

// ---------------------------------------------------------------------------
// CONFIG — edit these lists to change where the morning job hunts.
// ---------------------------------------------------------------------------

/** Keyword queries used by keyword-driven boards (Remotive, LinkedIn). */
const SEARCH_TERMS = ["nestjs", "next.js react", "fastapi python", "full stack developer"];

/** Public Greenhouse board slugs (boards-api.greenhouse.io/v1/boards/<slug>/jobs). */
const GREENHOUSE_BOARDS = ["airbnb", "stripe", "discord", "figma"];

/** Public Lever company slugs (api.lever.co/v0/postings/<slug>). */
const LEVER_COMPANIES = ["plaid", "netflix", "leverdemo"];

/** Public Ashby board slugs (api.ashbyhq.com/posting-api/job-board/<slug>). */
const ASHBY_BOARDS = ["ramp", "linear", "vercel"];

/** We Work Remotely RSS categories (…/categories/<slug>.rss). */
const WWR_FEEDS = [
  "remote-full-stack-programming-jobs",
  "remote-back-end-programming-jobs",
  "remote-front-end-programming-jobs",
];

/** LinkedIn guest-search queries. location "" = worldwide. */
const LINKEDIN_SEARCHES = [
  { keywords: "nestjs next.js", location: "" },
  { keywords: "react node full stack", location: "" },
  { keywords: "fastapi python backend", location: "" },
];

const PER_SOURCE_CAP = 60;
const USER_AGENT = "job-finder/0.1 (+personal job search)";

/** Only keep jobs whose title/description plausibly fits the candidate's stack. */
const STACK_RELEVANCE =
  /react|next\.?js|node|nest|javascript|typescript|full.?stack|fastapi|flask|python|mern|mongo|express|front.?end|back.?end|web developer|software engineer|ai engineer|machine learning|\bllm\b|\brag\b|flutter|\.net/i;

function isRelevant(job: ScrapedJob) {
  return STACK_RELEVANCE.test(`${job.title} ${job.description ?? ""}`);
}

/** Strip tracking params so the same posting from two sources dedupes cleanly. */
function cleanUrl(url: string) {
  return url.split("?")[0].replace(/\/$/, "");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connectors — each is best-effort and resolves to [] on any failure.
// ---------------------------------------------------------------------------

type RemoteOkJob = {
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
};

async function fetchRemoteOk(): Promise<ScrapedJob[]> {
  const data = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api");
  if (!Array.isArray(data)) return [];

  return data
    .filter((job) => job.position && job.company && job.url)
    .map((job) => ({
      title: job.position!,
      company: job.company!,
      location: job.location || "Remote",
      url: job.url!,
      source: "RemoteOK",
      description: job.description ?? (job.tags ?? []).join(", "),
      salary:
        job.salary_min || job.salary_max
          ? `${job.salary_min ?? "?"}-${job.salary_max ?? "?"}`
          : null,
      postedAt: job.date ? new Date(job.date) : null,
    }))
    .filter(isRelevant)
    .slice(0, PER_SOURCE_CAP);
}

type RemotiveResponse = {
  jobs?: Array<{
    title?: string;
    company_name?: string;
    candidate_required_location?: string;
    url?: string;
    description?: string;
    salary?: string;
    publication_date?: string;
  }>;
};

async function fetchRemotive(term: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<RemotiveResponse>(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=${PER_SOURCE_CAP}`,
  );

  return (data?.jobs ?? [])
    .filter((job) => job.title && job.company_name && job.url)
    .map((job) => ({
      title: job.title!,
      company: job.company_name!,
      location: job.candidate_required_location || "Remote",
      url: job.url!,
      source: "Remotive",
      description: job.description ?? null,
      salary: job.salary || null,
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
    }));
}

type ArbeitnowResponse = {
  data?: Array<{
    title?: string;
    company_name?: string;
    location?: string;
    url?: string;
    description?: string;
    remote?: boolean;
    created_at?: number;
  }>;
};

async function fetchArbeitnow(): Promise<ScrapedJob[]> {
  const data = await fetchJson<ArbeitnowResponse>("https://www.arbeitnow.com/api/job-board-api");

  return (data?.data ?? [])
    .filter((job) => job.title && job.company_name && job.url && job.remote)
    .map((job) => ({
      title: job.title!,
      company: job.company_name!,
      location: job.location || "Remote",
      url: job.url!,
      source: "Arbeitnow",
      description: job.description ?? null,
      salary: null,
      postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
    }))
    .filter(isRelevant)
    .slice(0, PER_SOURCE_CAP);
}

async function fetchGreenhouseBoard(companySlug: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<{
    jobs?: Array<{
      title?: string;
      absolute_url?: string;
      location?: { name?: string };
      content?: string;
      updated_at?: string;
    }>;
  }>(`https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs`);

  return (data?.jobs ?? [])
    .filter((job) => job.title && job.absolute_url)
    .map((job) => ({
      title: job.title!,
      company: companySlug,
      location: job.location?.name ?? null,
      url: job.absolute_url!,
      source: "Greenhouse",
      description: job.content ?? null,
      salary: null,
      postedAt: job.updated_at ? new Date(job.updated_at) : null,
    }))
    .filter(isRelevant)
    .slice(0, PER_SOURCE_CAP);
}

async function fetchLever(companySlug: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<
    Array<{
      text?: string;
      hostedUrl?: string;
      categories?: { location?: string; commitment?: string };
      descriptionPlain?: string;
      createdAt?: number;
    }>
  >(`https://api.lever.co/v0/postings/${companySlug}?mode=json`);
  if (!Array.isArray(data)) return [];

  return data
    .filter((job) => job.text && job.hostedUrl)
    .map((job) => ({
      title: job.text!,
      company: companySlug,
      location: job.categories?.location ?? null,
      url: job.hostedUrl!,
      source: "Lever",
      description: job.descriptionPlain ?? null,
      salary: null,
      postedAt: job.createdAt ? new Date(job.createdAt) : null,
    }))
    .filter(isRelevant)
    .slice(0, PER_SOURCE_CAP);
}

async function fetchAshby(boardSlug: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<{
    jobs?: Array<{
      title?: string;
      location?: string;
      jobUrl?: string;
      applyUrl?: string;
      descriptionPlain?: string;
      isRemote?: boolean;
      publishedAt?: string;
    }>;
  }>(`https://api.ashbyhq.com/posting-api/job-board/${boardSlug}`);

  return (data?.jobs ?? [])
    .filter((job) => job.title && (job.jobUrl || job.applyUrl))
    .map((job) => ({
      title: job.title!,
      company: boardSlug,
      location: job.location ?? (job.isRemote ? "Remote" : null),
      url: (job.jobUrl || job.applyUrl)!,
      source: "Ashby",
      description: job.descriptionPlain ?? null,
      salary: null,
      postedAt: job.publishedAt ? new Date(job.publishedAt) : null,
    }))
    .filter(isRelevant)
    .slice(0, PER_SOURCE_CAP);
}

async function fetchWeWorkRemotely(feedSlug: string): Promise<ScrapedJob[]> {
  const xml = await fetchText(`https://weworkremotely.com/categories/${feedSlug}.rss`);
  if (!xml) return [];

  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs: ScrapedJob[] = [];

  $("item").each((_, element) => {
    const item = $(element);
    const rawTitle = item.find("title").first().text().trim();
    const link = item.find("link").first().text().trim();
    if (!rawTitle || !link) return;

    // WWR titles are formatted "Company: Position".
    const [companyPart, ...titleParts] = rawTitle.split(":");
    const company = titleParts.length ? companyPart.trim() : "Unknown";
    const title = titleParts.length ? titleParts.join(":").trim() : rawTitle;

    jobs.push({
      title,
      company,
      location: item.find("region").first().text().trim() || "Remote",
      url: link,
      source: "WeWorkRemotely",
      description: item.find("description").first().text().trim() || null,
      salary: null,
      postedAt: item.find("pubDate").first().text()
        ? new Date(item.find("pubDate").first().text())
        : null,
    });
  });

  return jobs.slice(0, PER_SOURCE_CAP);
}

/**
 * LinkedIn guest job-search endpoint (no login). BEST-EFFORT ONLY.
 *
 * This works from a residential IP (your local machine / `npm run jobs:run`)
 * and from GitHub Actions, but LinkedIn rate-limits/blocks datacenter IPs, so
 * it will usually return nothing when run from Vercel's serverless cron. It is
 * intentionally fail-soft: any block resolves to [] and the rest of the run
 * continues. Use it for personal job discovery, not bulk scraping.
 */
async function fetchLinkedIn(keywords: string, location: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  // Two pages of ~10 cards each, restricted to remote (f_WT=2) and last week (f_TPR).
  for (const start of [0, 25]) {
    const url =
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` +
      `?keywords=${encodeURIComponent(keywords)}` +
      `&location=${encodeURIComponent(location || "Worldwide")}` +
      `&f_WT=2&f_TPR=r604800&start=${start}`;

    const html = await fetchText(url);
    if (!html) break;

    const $ = cheerio.load(html);
    const cards = $("li");
    if (cards.length === 0) break;

    cards.each((_, element) => {
      const card = $(element);
      const title = card.find(".base-search-card__title").text().trim();
      const company = card.find(".base-search-card__subtitle").text().trim();
      const href =
        card.find("a.base-card__full-link").attr("href") || card.find("a").attr("href");
      if (!title || !href) return;

      const datetime = card.find("time").attr("datetime");
      jobs.push({
        title,
        company: company || "Unknown",
        location: card.find(".job-search-card__location").text().trim() || "Remote",
        url: cleanUrl(href),
        source: "LinkedIn",
        description: null,
        salary: null,
        postedAt: datetime ? new Date(datetime) : null,
      });
    });
  }

  return jobs.filter(isRelevant).slice(0, PER_SOURCE_CAP);
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function scrapeConfiguredSources(): Promise<ScrapedJob[]> {
  const tasks: Array<Promise<ScrapedJob[]>> = [
    fetchRemoteOk(),
    fetchArbeitnow(),
    ...SEARCH_TERMS.map((term) => fetchRemotive(term)),
    ...GREENHOUSE_BOARDS.map((slug) => fetchGreenhouseBoard(slug)),
    ...LEVER_COMPANIES.map((slug) => fetchLever(slug)),
    ...ASHBY_BOARDS.map((slug) => fetchAshby(slug)),
    ...WWR_FEEDS.map((slug) => fetchWeWorkRemotely(slug)),
    ...LINKEDIN_SEARCHES.map((search) => fetchLinkedIn(search.keywords, search.location)),
  ];

  const settled = await Promise.allSettled(tasks);
  const all = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  // Dedupe by normalized URL (first source to surface a job wins).
  const seen = new Map<string, ScrapedJob>();
  for (const job of all) {
    const key = cleanUrl(job.url).toLowerCase();
    if (!seen.has(key)) seen.set(key, { ...job, url: cleanUrl(job.url) });
  }

  return Array.from(seen.values());
}

/** Sources actually queried above — recorded on each CronRun for transparency. */
export const plannedSources = [
  "RemoteOK",
  "Remotive",
  "Arbeitnow",
  "Greenhouse",
  "Lever",
  "Ashby",
  "WeWorkRemotely",
  "LinkedIn",
];
