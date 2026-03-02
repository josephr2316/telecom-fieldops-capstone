-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "technician_notes" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
