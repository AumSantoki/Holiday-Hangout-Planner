-- Holiday Hangout Planner Database Schema for Neon PostgreSQL
-- Used in API Blitz 2026 hackathon

CREATE TABLE IF NOT EXISTS holiday_plans (
  id VARCHAR(64) PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  holiday_name VARCHAR(255) NOT NULL,
  holiday_date VARCHAR(30) NOT NULL,
  activity TEXT NOT NULL,
  activity_type VARCHAR(50),
  participants INT DEFAULT 1,
  price NUMERIC(4, 2) DEFAULT 0,
  accessibility VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holiday_plans_created_at ON holiday_plans(created_at DESC);
