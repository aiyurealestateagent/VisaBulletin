# Visa Bulletin Scraper

Scrapes monthly US Visa Bulletin data from [travel.state.gov](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html) and stores it as static JSON files, served via GitHub raw URLs.

## What it does

- Parses Employment-Based (EB-1 through EB-5) and Family-Based (F1–F4) priority dates
- Extracts both **Final Action Dates** (Chart A) and **Dates for Filing** (Chart B)
- Covers all tracked countries: China, India, Mexico, Philippines, and All Other
- Stores structured JSON in `data/` directory, committed to the repo
- Generates aggregated `latest.json` (2 most recent) and `trend.json` (12 most recent) for client consumption

## Architecture

```
GitHub Actions (monthly cron)
  ↓ scrape travel.state.gov
  ↓ generate JSON files
  ↓ git commit + push
GitHub raw URL (CDN)
  ↓ static JSON
```

## Data URLs

```
https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/latest.json
https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/trend.json
```

## File Structure

```
data/
├── latest.json          ← most recent 2 bulletins
├── trend.json           ← most recent 12 bulletins
└── bulletins/           ← individual monthly archives
    ├── 2026-03.json
    ├── 2026-02.json
    └── ...
```

## Tech Stack

- **TypeScript** + **tsx** runtime
- **Cheerio** for HTML parsing
- **GitHub Actions** for scheduled scraping
- **GitHub raw URLs** for static hosting (zero cost)

## Setup

```bash
npm install
```

## Usage

**Scrape the latest bulletin:**

```bash
npm run scrape
```

**Backfill the last 36 months:**

```bash
npm run backfill
```

## Data Shape

Each bulletin is stored as JSON with this structure:

```json
{
  "id": "2026-03",
  "bulletin_date": "2026-03",
  "published_date": "2026-03-12",
  "data": {
    "employmentBased": {
      "finalActionDates": {
        "EB-1": { "allOther": "C", "china": "2022-12-01", "india": "2021-06-01", "mexico": "C", "philippines": "C" }
      },
      "datesForFiling": { ... }
    },
    "familyBased": {
      "finalActionDates": { ... },
      "datesForFiling": { ... }
    }
  },
  "created_at": "2026-03-12T12:00:00.000Z"
}
```

Date values are `YYYY-MM-DD`, `C` (Current), or `U` (Unavailable).

## Automation

GitHub Actions runs daily from the 10th to 20th of each month at 12:00 UTC, covering the typical visa bulletin publication window. When a new bulletin is found, the scraper saves JSON files and commits them to the repo automatically.

Manual runs are also supported via `workflow_dispatch` with `scrape` or `backfill` mode.
