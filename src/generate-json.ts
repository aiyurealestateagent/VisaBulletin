import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { BulletinData, BulletinRow } from "./types";

const DATA_DIR = join(__dirname, "..", "data");
const BULLETINS_DIR = join(DATA_DIR, "bulletins");

// 确保目录存在
mkdirSync(BULLETINS_DIR, { recursive: true });

/**
 * 保存单期 bulletin 到 data/bulletins/YYYY-MM.json
 */
export function saveBulletin(bulletinDate: string, data: BulletinData, publishedDate?: string): void {
  const row: BulletinRow = {
    id: bulletinDate,
    bulletin_date: bulletinDate,
    published_date: publishedDate ?? null,
    data,
    created_at: new Date().toISOString(),
  };

  const filePath = join(BULLETINS_DIR, `${bulletinDate}.json`);
  writeFileSync(filePath, JSON.stringify(row, null, 2));
  console.log(`  Saved ${filePath}`);
}

/**
 * 检查某期 bulletin 是否已存在
 */
export function bulletinExists(bulletinDate: string): boolean {
  return existsSync(join(BULLETINS_DIR, `${bulletinDate}.json`));
}

/**
 * 从 data/bulletins/ 读取所有已存档的 bulletin，按日期倒序
 */
function loadAllBulletins(): BulletinRow[] {
  if (!existsSync(BULLETINS_DIR)) return [];

  const files = readdirSync(BULLETINS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse(); // 倒序：最新在前

  return files.map((f) => {
    const content = readFileSync(join(BULLETINS_DIR, f), "utf-8");
    return JSON.parse(content) as BulletinRow;
  });
}

/**
 * 重新生成 latest.json 和 trend.json（聚合文件）
 * 每次 scrape 后都应调用
 */
export function regenerateAggregates(): void {
  const all = loadAllBulletins();

  // latest.json: 最近 2 期（iOS fetchLatestBulletins 用）
  const latest = all.slice(0, 2);
  writeFileSync(join(DATA_DIR, "latest.json"), JSON.stringify(latest, null, 2));
  console.log(`  Generated latest.json (${latest.length} bulletins)`);

  // trend.json: 最近 12 期（iOS fetchTrendData 用）
  const trend = all.slice(0, 12);
  writeFileSync(join(DATA_DIR, "trend.json"), JSON.stringify(trend, null, 2));
  console.log(`  Generated trend.json (${trend.length} bulletins)`);
}
