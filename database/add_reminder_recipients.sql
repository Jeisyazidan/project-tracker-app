-- Migration: add recipients column to reminder_logs so the Email Log can
-- show who each reminder was actually sent to (most recent send).

ALTER TABLE reminder_logs ADD COLUMN IF NOT EXISTS recipients TEXT[] NOT NULL DEFAULT '{}';
