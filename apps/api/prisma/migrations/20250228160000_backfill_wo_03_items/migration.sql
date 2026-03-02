-- Backfill items for wo_03 when empty (NULL or '[]').
UPDATE work_orders
SET items = '[{"productId":"prod_cable_fiber_10m","qty":1}]'::jsonb
WHERE id = 'wo_03'
  AND (items IS NULL OR items = '[]'::jsonb OR jsonb_array_length(items) = 0);
