-- Ejecutar en el SQL Editor de Supabase

-- =====================
-- MULTI-TENANT: Tenants
-- =====================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#f59e0b',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'premium')),
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  appointments_limit INTEGER NOT NULL DEFAULT 0,
  staff_limit INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants are public"
  ON tenants FOR SELECT
  USING (true);

CREATE POLICY "Tenant owners can update"
  ON tenants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.tenant_id = tenants.id
    AND profiles.id = auth.uid()
    AND profiles.role IN ('owner', 'admin')
  ));

-- =====================
-- Profiles (multi-tenant)
-- =====================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- =====================
-- Availability (multi-tenant)
-- =====================
ALTER TABLE availability ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
DROP INDEX IF EXISTS idx_availability_tenant_day;
CREATE UNIQUE INDEX idx_availability_tenant_day ON availability(tenant_id, day_of_week);

-- =====================
-- Blocked dates (multi-tenant)
-- =====================
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
DROP INDEX IF EXISTS idx_blocked_dates_tenant_date;
CREATE UNIQUE INDEX idx_blocked_dates_tenant_date ON blocked_dates(tenant_id, date);

-- =====================
-- Services (multi-tenant)
-- =====================
ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- =====================
-- Appointments (multi-tenant)
-- =====================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Payment fields
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

-- WhatsApp reminder tracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_appointments_date_time ON appointments(date, time);
CREATE INDEX idx_appointments_payment_intent ON appointments(payment_intent_id);
CREATE INDEX idx_appointments_tenant_date ON appointments(tenant_id, date);

-- =====================
-- RLS: Update policies for tenant isolation
-- =====================

-- Profiles RLS (updated)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Tenant members can view profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin')
      AND p.tenant_id = profiles.tenant_id
    )
  );

-- Availability RLS (updated)
DROP POLICY IF EXISTS "Admins can manage availability" ON availability;
CREATE POLICY "Tenant staff can manage availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = availability.tenant_id
      AND profiles.role IN ('owner', 'admin', 'staff')
    )
  );

-- Blocked dates RLS (updated)
DROP POLICY IF EXISTS "Admins can manage blocked dates" ON blocked_dates;
CREATE POLICY "Tenant staff can manage blocked dates"
  ON blocked_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = blocked_dates.tenant_id
      AND profiles.role IN ('owner', 'admin', 'staff')
    )
  );

-- Services RLS (updated)
DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Tenant staff can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = services.tenant_id
      AND profiles.role IN ('owner', 'admin', 'staff')
    )
  );

-- =====================
-- Plans configuration
-- =====================
CREATE TABLE IF NOT EXISTS plan_definitions (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  appointments_limit INTEGER NOT NULL DEFAULT 0,
  staff_limit INTEGER NOT NULL DEFAULT 1,
  features TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO plan_definitions (key, name, price_monthly, appointments_limit, staff_limit, features)
VALUES
  ('free', 'Gratuito', 0, 30, 1, ARRAY['Agenda básica', 'Página pública', 'Notificaciones email']),
  ('basic', 'Básico', 1999, 100, 3, ARRAY['Agenda básica', 'Página pública', 'Notificaciones email', 'WhatsApp', 'Pagos con tarjeta']),
  ('pro', 'Profesional', 4999, 500, 10, ARRAY['Todo lo de Básico', 'Mercado Pago', 'Staff ilimitado', 'Recordatorios WhatsApp', 'Reportes de ingresos']),
  ('premium', 'Premium', 9999, 999999, 999, ARRAY['Todo lo de Pro', 'Sin límites', 'Prioridad', 'Múltiples sedes', 'Soporte dedicado'])
ON CONFLICT (key) DO NOTHING;
