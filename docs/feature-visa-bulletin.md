# Feature Request: Visa Bulletin (排期查询)

## Overview

Display monthly Visa Bulletin data (priority dates) from the US Department of State, allowing users to check visa availability for Employment-Based and Family-Based categories.

## Data Source

- **Publisher:** US Department of State (travel.state.gov)
- **URL pattern:** `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/{year}/visa-bulletin-for-{month}-{year}.html`
- **Update frequency:** Monthly (typically mid-month for the following month)
- **No official API available** — data must be parsed from HTML or sourced from a third party

## Data Dimensions

### Categories
| Type | Subcategories |
|------|---------------|
| Employment Based | EB-1, EB-2, EB-3, EB-4, EB-5 Unreserved, EB-5 Set Aside (Rural, High Unemployment, Infrastructure), Other Workers, Certain Religious Workers |
| Family Based | F1, F2A, F2B, F3, F4 |

### Countries
- China (Mainland)
- India
- Mexico
- Philippines
- All Chargeability Areas (All Other)

### Tables (per bulletin)
1. **Final Action Dates** — when a visa number is available for issuance
2. **Dates for Filing Applications** — earliest date to submit application

### Values
- A specific date (e.g., `2023-08-01`) — meaning priority dates before this are current
- `C` (Current) — no backlog, all dates are eligible
- `U` (Unavailable) — category is not accepting applications

## Proposed Implementation

### Recommended: Backend Proxy (Approach B)

A serverless function (e.g., Cloudflare Worker, AWS Lambda, or Vercel Edge Function) that:

1. Scrapes the latest Visa Bulletin HTML from travel.state.gov on a schedule (or on-demand with caching)
2. Parses the two tables (Final Action Dates + Dates for Filing) into structured JSON
3. Serves the JSON to the iOS app via a simple GET endpoint
4. Optionally stores historical bulletins for trend analysis

**Why backend over client-side parsing:**
- HTML structure changes don't require an app update
- Can cache and serve faster
- Enables historical data storage for trend features
- Keeps the iOS app lightweight

### API Response Shape (proposed)

```json
{
  "bulletinDate": "2026-03",
  "publishedDate": "2026-02-15",
  "employmentBased": {
    "finalActionDates": {
      "EB-1": { "allOther": "C", "china": "2022-12-01", "india": "2021-06-01", "mexico": "C", "philippines": "C" },
      "EB-2": { "allOther": "C", "china": "2020-04-01", "india": "2012-01-01", "mexico": "C", "philippines": "C" },
      ...
    },
    "datesForFiling": { ... }
  },
  "familyBased": {
    "finalActionDates": { ... },
    "datesForFiling": { ... }
  }
}
```

### iOS App Changes

1. **New tab:** Add a "Visa Bulletin" tab to the app (requires switching from NavigationStack to TabView)
2. **Models:** `VisaBulletin`, `BulletinCategory`, `BulletinEntry` structs
3. **Service:** `VisaBulletinService` to fetch from the backend endpoint
4. **Views:**
   - Country selector (flags: China, India, Mexico, Philippines, All Other)
   - Category toggle (Employment Based / Family Based)
   - Table view with Final Action Dates and Dates for Filing
   - Optional: days advanced/retrogressed indicator (like the 1Point3Acres app shows "31d", "641d")
5. **Caching:** Cache the latest bulletin locally so the tab works offline
6. **Notifications (stretch goal):** Alert users when a new bulletin is published

### Navigation Structure Change

```
Current:                        After:
NavigationStack                 TabView
  └─ DashboardView                ├─ Tab: My Cases
      ├─ CaseDetailView           │    └─ (existing NavigationStack)
      └─ AddCaseView              ├─ Tab: Visa Bulletin
                                  │    └─ BulletinView
                                  └─ Tab: (future: News, Settings, etc.)
```

## Complexity Estimate

| Component | Effort |
|-----------|--------|
| Backend scraper + API | Medium — HTML parsing is fragile, needs testing |
| iOS models + service | Low |
| iOS bulletin UI | Medium — multiple dimensions to display clearly |
| TabView migration | Low — straightforward refactor |
| Historical trends (stretch) | Medium — needs backend storage + chart UI |

## Open Questions

- [ ] Which backend platform to use? (Cloudflare Workers, Vercel, AWS Lambda, etc.)
- [ ] Store historical data from day one, or add later?
- [ ] Support country-of-birth personalization? (user sets their country once, app highlights their row)
- [ ] Include a "days until current" estimate based on historical movement rates?

## References

- [Visa Bulletin page](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html)
- [1Point3Acres Case Tracker](https://apps.apple.com/app/id1469aborting) — reference implementation with Visa Bulletin + News tabs
- [Praven Moorthy Case Tracker](https://apps.apple.com/app/id1496473498) — reference with form type labels
