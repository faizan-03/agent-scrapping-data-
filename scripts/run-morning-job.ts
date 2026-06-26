import { runMorningJob } from "@/lib/jobs/workflow";

runMorningJob()
  .then((run) => {
    console.log(`Morning job complete: ${run.scrapedCount} scraped, ${run.matchedCount} matched`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
