# Visa Bulletin 后端迁移：Supabase → 静态 JSON (GitHub Pages)

## 为什么迁移

Supabase 免费版只有 2 个 project 名额，Visa Bulletin 数据特征（只读、月更、~36 条记录、2 个固定查询）不需要数据库。改为 GitHub Pages 托管静态 JSON，零成本零维护。

---

## 最终目标架构

```
GitHub Actions (scraper)
  ↓ 爬取 + 生成 JSON
  ↓ git commit + push
GitHub Pages (CDN)
  ↓ 静态文件
iOS App (fetch URL)
```

```
data/
├── latest.json     ← iOS fetchLatestBulletins() 用（最近 2 期）
├── trend.json      ← iOS fetchTrendData() 用（最近 12 期）
└── bulletins/      ← 单期存档（按月归档）
    ├── 2026-03.json
    ├── 2026-02.json
    └── ...
```

---

## 具体改动步骤

### Step 1: 启用 GitHub Pages

1. 去 VisaBulletin repo 的 Settings → Pages
2. Source 选 **GitHub Actions**（推荐）或 **Deploy from a branch**（选 `main`, `/data` 目录）
3. 记下最终 URL，格式：`https://<username>.github.io/VisaBulletin/`

> 如果用 Deploy from branch，数据必须在根目录或 `/docs` 下。建议用 GitHub Actions 部署更灵活。

### Step 2: 创建 `data/` 目录

```bash
mkdir -p data/bulletins
```

### Step 3: 新增 `src/generate-json.ts` — 核心：生成静态 JSON 文件

这个脚本替代 Supabase 写入，改为写本地 JSON 文件。

```typescript
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
    id: bulletinDate, // 用 bulletinDate 作 id，不再需要 UUID
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
```

### Step 4: 修改 `src/scrape-latest.ts` — 去掉 Supabase，改为写文件

```typescript
import { scrapeBulletin } from "./scraper";
import { saveBulletin, bulletinExists, regenerateAggregates } from "./generate-json";

async function main() {
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth() + 2;
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
```

### Step 5: 修改 `src/backfill.ts` — 同理去掉 Supabase

```typescript
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
```

### Step 6: 删除 `src/supabase.ts`

不再需要 Supabase 客户端。

### Step 7: 修改 `package.json` — 去掉 Supabase 依赖

```json
{
  "name": "visa-bulletin",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "scrape": "tsx src/scrape-latest.ts",
    "backfill": "tsx src/backfill.ts"
  },
  "dependencies": {
    "cheerio": "^1.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

然后运行 `npm install` 更新 lock 文件。

### Step 8: 修改 `.github/workflows/scrape.yml`

关键变化：
- 去掉 Supabase secrets
- 爬取后 **git commit + push** JSON 文件
- 添加 GitHub Pages 部署（如果用 Actions 部署模式）

```yaml
name: Scrape Visa Bulletin

on:
  schedule:
    - cron: "0 12 10 * *"
    - cron: "0 12 11 * *"
    - cron: "0 12 12 * *"
    - cron: "0 12 13 * *"
    - cron: "0 12 14 * *"
    - cron: "0 12 15 * *"
    - cron: "0 12 16 * *"
    - cron: "0 12 17 * *"
    - cron: "0 12 18 * *"
    - cron: "0 12 19 * *"
    - cron: "0 12 20 * *"

  workflow_dispatch:
    inputs:
      mode:
        description: "Run mode"
        required: true
        default: "scrape"
        type: choice
        options:
          - scrape
          - backfill

permissions:
  contents: write  # 需要 push 权限

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Scrape latest bulletin
        if: github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.event.inputs.mode == 'scrape')
        run: npm run scrape

      - name: Backfill historical data
        if: github.event_name == 'workflow_dispatch' && github.event.inputs.mode == 'backfill'
        run: npm run backfill
        timeout-minutes: 30

      - name: Commit and push data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git diff --cached --quiet && echo "No changes to commit" && exit 0
          git commit -m "Update visa bulletin data $(date -u +%Y-%m-%d)"
          git push
```

> **注意**：如果你选择用 GitHub Actions 部署 Pages，还需要加一个部署 step。
> 但更简单的方式是直接在 Settings → Pages 里选 "Deploy from branch: main / data folder"。
> 由于 GitHub Pages 只支持根目录 `/` 或 `/docs`，如果用 branch 模式，需要把 `data/` 改为 `docs/data/` 或者用 Actions 部署模式。

### Step 9: 删除 Supabase 相关文件

```bash
rm src/supabase.ts
# supabase/migration.sql 可以保留作为历史参考，或删除
```

### Step 10: 清理 GitHub repo Secrets

在 VisaBulletin repo 的 Settings → Secrets and variables → Actions 中删除：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## 首次迁移：导入历史数据

迁移时先运行一次 backfill 把历史数据从 State Dept 网站重新爬取（不是从 Supabase 导出）：

```bash
npm run backfill
```

这会：
1. 爬取最近 36 个月的 bulletin
2. 保存到 `data/bulletins/YYYY-MM.json`
3. 生成 `data/latest.json` 和 `data/trend.json`

然后 commit + push 即可。

---

## GitHub Pages 部署方式选择

### 方式 A: Deploy from branch（最简单）

1. Settings → Pages → Source: "Deploy from a branch"
2. Branch: `main`, Folder: `/ (root)`
3. JSON 文件通过 `https://<user>.github.io/VisaBulletin/data/latest.json` 访问

### 方式 B: GitHub Actions 部署（更灵活）

在 workflow 末尾加上 Pages 部署 step：

```yaml
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./data
```

访问 URL: `https://<user>.github.io/VisaBulletin/latest.json`

---

## iOS 端对应的 JSON 格式

`latest.json` 和 `trend.json` 都是 `BulletinRow[]` 数组，格式与当前 Supabase 返回完全一致：

```json
[
  {
    "id": "2026-03",
    "bulletin_date": "2026-03",
    "published_date": "2026-03-12",
    "data": {
      "employmentBased": {
        "finalActionDates": {
          "EB-1": { "allOther": "C", "china": "2023-02-01", ... },
          ...
        },
        "datesForFiling": { ... }
      },
      "familyBased": { ... }
    },
    "created_at": "2026-03-12T12:00:00.000Z"
  }
]
```

iOS 端 `BulletinRow` 的 `Codable` 定义不需要改动，因为 JSON 字段名完全对应。唯一区别是 `id` 从 UUID 变成了 `"2026-03"` 这样的字符串，但 iOS 端 `id` 是 `String` 类型，完全兼容。

---

## 完成后

后端改好、GitHub Pages 部署成功后，告诉我最终的 Pages URL，我来改 iOS 端的 `VisaBulletinService.swift`。iOS 端改动很小：
1. 去掉 `apikey` header
2. 改 URL 为 GitHub Pages 地址
3. 移除 Info.plist 中的 Supabase 配置

---

## Checklist

- [ ] 创建 `data/bulletins/` 目录
- [ ] 新增 `src/generate-json.ts`
- [ ] 改写 `src/scrape-latest.ts`（去 Supabase，写文件）
- [ ] 改写 `src/backfill.ts`（去 Supabase，写文件）
- [ ] 删除 `src/supabase.ts`
- [ ] 更新 `package.json`（去掉 `@supabase/supabase-js`）
- [ ] 运行 `npm install`
- [ ] 更新 `.github/workflows/scrape.yml`（去 secrets，加 git push）
- [ ] 运行 `npm run backfill` 导入历史数据
- [ ] Git commit + push
- [ ] 启用 GitHub Pages
- [ ] 验证 `https://<user>.github.io/VisaBulletin/data/latest.json` 可访问
- [ ] 清理 GitHub repo 里的 Supabase secrets
- [ ] 关闭 Supabase 项目
