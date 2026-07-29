-- Restructure plans: remove inicial/profesional, add pro
-- New structure: free, pro, premium

-- Update existing tenants: inicial → pro, profesional → pro
UPDATE tenants SET subscription_status = 'pro', turnos_limit = 200, staff_limit = 3
WHERE subscription_status IN ('inicial', 'profesional');

-- Drop old CHECK constraint
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;

-- Add new CHECK constraint
ALTER TABLE tenants ADD CONSTRAINT tenants_subscription_status_check
  CHECK (subscription_status IN ('free', 'pro', 'premium'));

-- Update plan_definitions if they exist
DELETE FROM plan_definitions WHERE name IN ('inicial', 'profesional');

INSERT INTO plan_definitions (name, max_turnos, max_staff, price_monthly_cents, description)
VALUES
  ('free', 30, 1, 0, '30 turnos/mes, 1 usuario. Ideal para empezar.'),
  ('pro', 200, 3, 1200, '200 turnos/mes, 3 usuarios. Alertas y funciones avanzadas.'),
  ('premium', 999999, 999, 2900, 'Ilimitado. Todo incluido: WhatsApp, recordatorios, depósito.')
ON CONFLICT (name) DO UPDATE SET
  max_turnos = EXCLUDED.max_turnos,
  max_staff = EXCLUDED.max_staff,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  description = EXCLUDED.description;
