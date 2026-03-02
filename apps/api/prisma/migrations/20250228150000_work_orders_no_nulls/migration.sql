-- Backfill NULLs and set defaults so work_orders.technician_notes and checklist are never null.

UPDATE work_orders SET technician_notes = '' WHERE technician_notes IS NULL;
UPDATE work_orders SET checklist = '[]'::jsonb WHERE checklist IS NULL;

ALTER TABLE work_orders ALTER COLUMN technician_notes SET DEFAULT '';
ALTER TABLE work_orders ALTER COLUMN technician_notes SET NOT NULL;

ALTER TABLE work_orders ALTER COLUMN checklist SET DEFAULT '[]'::jsonb;
ALTER TABLE work_orders ALTER COLUMN checklist SET NOT NULL;
