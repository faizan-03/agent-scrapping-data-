import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runMorningJob } from "@/lib/jobs/workflow";

export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  if (!env.CRON_SECRET) return process.env.NODE_ENV !== "production";
  const headerSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === env.CRON_SECRET || querySecret === env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runMorningJob();
  return NextResponse.json(run);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
