-- Premium feature infrastructure
-- All features are off by default — users enable them as needed

-- 1. Feature toggles stored as JSONB on each tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}';

-- 2. Client blacklist (Plan Inicial+)
CREATE TABLE IF NOT EXISTS client_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT,
  email TEXT,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cleaning/alistamiento margin per service (Plan Profesional)
ALTER TABLE services ADD COLUMN IF NOT EXISTS cleaning_time INT DEFAULT 0;

-- 4. Waitlist for cancelled slots (Plan Premium)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Confirmation fields on appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_token TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- 6. Waitlist notification sent flag
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS waitlist_notified BOOLEAN DEFAULT false;

-- 7. Tenant-level deposit percentage (Plan Premium)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_percent INT DEFAULT 0;

-- 8. Tenant-level default cleaning time (Plan Profesional)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_cleaning_time INT DEFAULT 0;

-- RLS policies
ALTER TABLE client_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Tenant admins can manage their own blacklist
CREATE POLICY "Tenant admins manage blacklist"
  ON client_blacklist FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Tenant admins can manage their own waitlist
CREATE POLICY "Tenant admins manage waitlist"
  ON waitlist FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
