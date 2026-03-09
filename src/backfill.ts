import { scrapeBulletin } from "./scraper";
import { saveBulletin, bulletinExists, regenerateAggregates } from "./generate-json";

const MONTHS_TO_BACKFILL = 36;
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMonthsToFetch(count: number): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    months.push({ year, month });
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
  }
  return months;
}

async function main() {
  const monthsToFetch = getMonthsToFetch(MONTHS_TO_BACKFILL);
  console.log(`Backfilling ${monthsToFetch.length} months of visa bulletins...\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const { year, month } of monthsToFetch) {
    const bulletinDate = `${year}-${String(month).padStart(2, "0")}`;

    if (bulletinExists(bulletinDate)) {
      console.log(`  [SKIP] ${bulletinDate} - already exists`);
      skipped++;
      continue;
    }

    try {
      console.log(`  [FETCH] ${bulletinDate}...`);
      const data = await scrapeBulletin(year, month);

      const ebCount = Object.keys(data.employmentBased.finalActionDates).length;
      const fbCount = Object.keys(data.familyBased.finalActionDates).length;

      if (ebCount === 0 || fbCount === 0) {
        console.log(`  [WARN]  ${bulletinDate} - parsed 0 categories (EB: ${ebCount}, FB: ${fbCount}), skipping`);
        failed++;
        await sleep(DELAY_MS);
        continue;
      }

      saveBulletin(bulletinDate, data);
      console.log(`  [OK]    ${bulletinDate} - EB: ${ebCount}, FB: ${fbCount}`);
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  [ERROR] ${bulletinDate} - ${msg}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  // 全部爬完后统一生成聚合文件
  regenerateAggregates();

  console.log(`\nDone! Success: ${success}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
