# Feature: Visa Bulletin (排期查询)

## Overview

Display monthly Visa Bulletin data (priority dates) from the US Department of State, allowing users to check visa availability for Employment-Based and Family-Based categories.

## Data Source

- **Publisher:** US Department of State (travel.state.gov)
- **URL pattern:** `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/{year}/visa-bulletin-for-{month}-{year}.html`
- **Update frequency:** Monthly (typically mid-month for the following month)
- **No official API available** — data is parsed from HTML

## Implementation

### Backend: Static JSON via GitHub

A TypeScript scraper runs on GitHub Actions and stores structured JSON directly in the repo:

```
GitHub Actions (monthly cron, 10th–20th)
  ↓ scrape travel.state.gov HTML
  ↓ parse tables with Cheerio
  ↓ write JSON to data/
  ↓ git commit + push
GitHub raw URL
  ↓ static JSON files
iOS App (fetch URL)
```

**Why static JSON over a database/API:**
- Zero cost — no server, no database, no hosting fees
- Zero maintenance — GitHub Actions + raw URLs, no infra to manage
- Data is public info updated monthly (~36 records total)
- Two fixed queries (latest 2, trend 12) map perfectly to pre-generated files

### Data Dimensions

#### Categories
| Type | Subcategories |
|------|---------------|
| Employment Based | EB-1, EB-2, EB-3, EB-4, EB-5 Unreserved, EB-5 Set Aside (Rural, High Unemployment, Infrastructure), Other Workers, Certain Religious Workers |
| Family Based | F1, F2A, F2B, F3, F4 |

#### Countries
- China (Mainland)
- India
- Mexico
- Philippines
- All Chargeability Areas (All Other)

#### Tables (per bulletin)
1. **Final Action Dates** — when a visa number is available for issuance
2. **Dates for Filing Applications** — earliest date to submit application

#### Values
- A specific date (e.g., `2023-08-01`) — meaning priority dates before this are current
- `C` (Current) — no backlog, all dates are eligible
- `U` (Unavailable) — category is not accepting applications

### iOS App Changes

1. **New tab:** "Visa Bulletin" tab in TabView
2. **Models:** `BulletinRow`, `BulletinData`, `BulletinSection`, `CountryDates`, `PriorityDateValue`
3. **Service:** Fetch from GitHub raw URLs, decode JSON, no auth needed
4. **Views:**
   - Country selector (flags: China, India, Mexico, Philippines, All Other)
   - Category toggle (Employment Based / Family Based)
   - Table view with Final Action Dates and Dates for Filing
   - Days advanced/retrogressed indicator ("+31d", "-5d")
5. **Caching:** Cache locally for offline use
6. **Trend chart:** Swift Charts with 12-month history

### Navigation Structure

```
TabView
  ├─ Tab: My Cases
  │    └─ (existing NavigationStack)
  ├─ Tab: Visa Bulletin
  │    └─ BulletinView
  └─ Tab: (future: News, Settings, etc.)
```

## References

- [Visa Bulletin page](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html)
