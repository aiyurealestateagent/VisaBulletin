import { scrapeBulletin } from "./scraper";
import { saveBulletin, bulletinExists, regenerateAggregates } from "./generate-json";

async function main() {
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth() + 2; // +1 for 0-indexed, +1 for next month
  if (targetMonth > 12) {
    targetMonth = 1;
    targetYear++;
  }

  const bulletinDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  console.log(`Checking for bulletin: ${bulletinDate}`);

  // 检查是否已存在（改为检查本地文件）
  if (bulletinExists(bulletinDate)) {
    console.log(`Bulletin for ${bulletinDate} already exists, skipping.`);
    return;
  }

  // 爬取
  console.log(`Scraping bulletin for ${bulletinDate}...`);
  let data;
  try {
    data = await scrapeBulletin(targetYear, targetMonth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("404")) {
      console.log("Bulletin not yet published.");
      return;
    }
    throw e;
  }

  // 校验
  const ebCount = Object.keys(data.employmentBased.finalActionDates).length;
  const fbCount = Object.keys(data.familyBased.finalActionDates).length;
  if (ebCount === 0 || fbCount === 0) {
    console.log(`Parse error: EB=${ebCount}, FB=${fbCount} categories. Skipping.`);
    return;
  }

  // 保存（写文件替代 Supabase insert）
  saveBulletin(bulletinDate, data, now.toISOString().split("T")[0]);

  // 重新生成聚合文件
  regenerateAggregates();

  console.log(`Stored bulletin for ${bulletinDate} (EB: ${ebCount}, FB: ${fbCount} categories)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
