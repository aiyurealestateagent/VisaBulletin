# Visa Bulletin Scraper

Scrapes monthly US Visa Bulletin data from [travel.state.gov](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html) and stores it in Supabase.

## What it does

- Parses Employment-Based (EB-1 through EB-5) and Family-Based (F1–F4) priority dates
- Extracts both **Final Action Dates** (Chart A) and **Dates for Filing** (Chart B)
- Covers all tracked countries: China, India, Mexico, Philippines, and All Other
- Stores structured JSON data in a Supabase `bulletins` table

## Tech Stack

- **TypeScript** + **tsx** runtime
- **Cheerio** for HTML parsing
- **Supabase** for storage

## Setup

```bash
npm install
```

Create a `.env` file with your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

Run the Supabase migration (`supabase/migration.sql`) to create the `bulletins` table.

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

Each bulletin is stored as JSONB with this structure:

```json
{
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
}
```

Date values are `YYYY-MM-DD`, `C` (Current), or `U` (Unavailable).
