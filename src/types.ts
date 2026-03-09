// Country keys used in bulletin data
export type Country = "allOther" | "china" | "india" | "mexico" | "philippines";

// Date value: either a date string (YYYY-MM-DD), "C" (Current), or "U" (Unavailable)
export type DateValue = string;

// A single row: category → country → date value
export type CategoryDates = Record<Country, DateValue>;

// Employment-Based category identifiers
export type EBCategory =
  | "EB-1"
  | "EB-2"
  | "EB-3"
  | "Other Workers"
  | "EB-4"
  | "Certain Religious Workers"
  | "EB-5 Unreserved"
  | "EB-5 Set Aside: Rural"
  | "EB-5 Set Aside: High Unemployment"
  | "EB-5 Set Aside: Infrastructure";

// Family-Based category identifiers
export type FBCategory = "F1" | "F2A" | "F2B" | "F3" | "F4";

// Table data: category name → country dates
export type TableData = Record<string, CategoryDates>;

// A chart (Final Action Dates or Dates for Filing)
export interface BulletinSection {
  finalActionDates: TableData;
  datesForFiling: TableData;
}

// Complete bulletin data stored in the JSONB `data` column
export interface BulletinData {
  employmentBased: BulletinSection;
  familyBased: BulletinSection;
}

// Database row shape
export interface BulletinRow {
  id: string;
  bulletin_date: string; // "YYYY-MM"
  published_date: string | null;
  data: BulletinData;
  created_at: string;
}

// API response for /api/latest
export interface LatestResponse {
  bulletin: BulletinRow;
  previous: BulletinRow | null;
  changes: BulletinChanges | null;
}

// Changes between two bulletins
export interface BulletinChanges {
  employmentBased: SectionChanges;
  familyBased: SectionChanges;
}

export interface SectionChanges {
  finalActionDates: Record<string, Record<string, DateChange>>;
  datesForFiling: Record<string, Record<string, DateChange>>;
}

export interface DateChange {
  current: DateValue;
  previous: DateValue;
  daysAdvanced: number | null; // null if either value is C or U
}

// API response for /api/trends
export interface TrendsResponse {
  category: string;
  country: string;
  table: "finalActionDates" | "datesForFiling";
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  bulletinDate: string;
  value: DateValue;
}

// Column mapping from HTML header text to our country keys
export const COLUMN_MAP: Record<string, Country> = {
  "all chargeability areas except those listed": "allOther",
  "china-mainland born": "china",
  "china- mainland born": "china",
  india: "india",
  mexico: "mexico",
  philippines: "philippines",
};

// Row label mapping from HTML to our category identifiers
export const EB_CATEGORY_MAP: Record<string, string> = {
  "1st": "EB-1",
  "2nd": "EB-2",
  "3rd": "EB-3",
  "other workers": "Other Workers",
  "4th": "EB-4",
  "certain religious workers": "Certain Religious Workers",
};

// Patterns for 5th preference categories
export const EB5_PATTERNS: [RegExp, string][] = [
  [/5th[\s\S]*unreserved/i, "EB-5 Unreserved"],
  [/5th[\s\S]*set[\s\S]*aside[\s\S]*rural/i, "EB-5 Set Aside: Rural"],
  [/5th[\s\S]*set[\s\S]*aside[\s\S]*high[\s\S]*unemployment/i, "EB-5 Set Aside: High Unemployment"],
  [/5th[\s\S]*set[\s\S]*aside[\s\S]*infrastructure/i, "EB-5 Set Aside: Infrastructure"],
];

export const FB_CATEGORY_MAP: Record<string, string> = {
  f1: "F1",
  f2a: "F2A",
  f2b: "F2B",
  f3: "F3",
  f4: "F4",
};

// Month names for URL construction
export const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Month abbreviation map for date parsing (DDMMMYY format)
export const MONTH_ABBR: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04",
  MAY: "05", JUN: "06", JUL: "07", AUG: "08",
  SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};
