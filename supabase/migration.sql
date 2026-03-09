-- Visa Bulletin storage table
-- Run this in the Supabase SQL Editor to create the table

CREATE TABLE bulletins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_date TEXT NOT NULL UNIQUE,      -- "2026-03" (YYYY-MM)
  published_date DATE,                      -- actual publish date
  data JSONB NOT NULL,                      -- complete bulletin data
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bulletins_date ON bulletins (bulletin_date DESC);
