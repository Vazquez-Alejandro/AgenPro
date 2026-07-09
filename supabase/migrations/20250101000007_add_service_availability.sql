-- Add service_id to availability (nullable = general availability)
ALTER TABLE availability ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE CASCADE;

-- Remove unique constraint on (tenant_id, day_of_week) since now we can have multiple per day
DROP INDEX IF EXISTS idx_availability_tenant_day;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_tenant_id_day_of_week_key;

-- New index for querying by tenant + service + day
CREATE INDEX IF NOT EXISTS idx_availability_tenant_service_day 
  ON availability(tenant_id, service_id, day_of_week);

-- Add filter_by_service flag to tenants
ALTER TABLE tenants ADD COLUMN filter_by_service BOOLEAN DEFAULT false;

-- Simplify plans: single $15/month plan
DELETE FROM plan_definitions;
INSERT INTO plan_definitions (name, max_turnos, max_staff, price_monthly_cents, description) 
VALUES ('pro', 999999, 999, 1500, 'Plan único - Todo incluido');
