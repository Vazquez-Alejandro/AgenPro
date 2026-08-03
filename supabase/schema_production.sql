-- ========================================
-- AGENPRO - Schema completo (orden corregido)
-- ========================================

-- Create profiles table FIRST (tenants references it)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID,
  is_admin BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff', 'client')),
  full_name TEXT,
  dni TEXT,
  phone TEXT,
  avatar_url TEXT,
  custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON profiles(dni);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f59e0b',
  subscription_status TEXT DEFAULT 'free',
  turnos_limit INT DEFAULT 30,
  staff_limit INT DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  deposit_percent INT DEFAULT 0,
  default_cleaning_time INT DEFAULT 0,
  filter_by_service BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tenants" ON tenants FOR SELECT USING (true);
CREATE POLICY "Anyone can create tenants" ON tenants FOR INSERT WITH CHECK (true);

-- Add FK from profiles to tenants
ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- Now add tenant-scoped policies
CREATE POLICY "Admins can read own profile and tenant profiles" ON profiles FOR SELECT
  USING (auth.uid() = id OR (is_admin = true AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Tenant admins can update their tenant" ON tenants FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id));

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  price INT NOT NULL DEFAULT 0,
  cleaning_time INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins can manage services" ON services FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id));
CREATE POLICY "Anyone can read active services" ON services FOR SELECT USING (active = true);
CREATE POLICY "Tenant admins can delete services" ON services FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id));

-- Create availability table
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  enabled BOOLEAN DEFAULT true,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  slot_duration INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_availability_tenant_service_day ON availability(tenant_id, service_id, day_of_week);
CREATE POLICY "Anyone can read availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Tenant admins can manage availability" ON availability FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = availability.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = availability.tenant_id));

-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date)
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blocked_dates_tenant_date ON blocked_dates(tenant_id, date);
CREATE POLICY "Anyone can read blocked dates" ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "Tenant admins can manage blocked dates" ON blocked_dates FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id));
CREATE POLICY "Tenant admins can delete blocked dates" ON blocked_dates FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id));

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  service_id UUID REFERENCES services(id),
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method TEXT,
  payment_id TEXT,
  amount_paid INT DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  recurring_end_date DATE,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  confirmation_token TEXT,
  confirmed_at TIMESTAMPTZ,
  no_show BOOLEAN DEFAULT false,
  waitlist_notified BOOLEAN DEFAULT false,
  notes TEXT,
  service TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_check ON appointments(tenant_id, date, status, reminder_24h_sent, reminder_1h_sent) WHERE status = 'confirmed' AND client_phone IS NOT NULL;
CREATE POLICY "Users can read own appointments" ON appointments FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = appointments.tenant_id));
CREATE POLICY "Authenticated users can create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = appointments.tenant_id));

-- Create plan_definitions table
CREATE TABLE IF NOT EXISTS plan_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  max_turnos INT NOT NULL,
  max_staff INT NOT NULL,
  price_monthly_cents INT NOT NULL DEFAULT 0,
  description TEXT
);

ALTER TABLE plan_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan definitions" ON plan_definitions FOR SELECT USING (true);

-- Create client_blacklist table
CREATE TABLE IF NOT EXISTS client_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT,
  email TEXT,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_blacklist ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_phone ON client_blacklist(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_email ON client_blacklist(tenant_id, email);
CREATE POLICY "Tenant admins manage blacklist" ON client_blacklist FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Tenant admins can delete blacklist entries" ON client_blacklist FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = client_blacklist.tenant_id));

-- Create waitlist table
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

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_date ON waitlist(tenant_id, date);
CREATE POLICY "Tenant admins manage waitlist" ON waitlist FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed plan definitions
INSERT INTO plan_definitions (name, max_turnos, max_staff, price_monthly_cents, description)
VALUES
  ('free',     30,     1,      0,     '30 turnos/mes, 1 usuario. Ideal para empezar.'),
  ('pro',      200,    3,      1200,  '200 turnos/mes, 3 usuarios. Alertas y funciones avanzadas.'),
  ('premium',  999999, 999999, 2900,  'Ilimitado. Todo incluido: WhatsApp, recordatorios, depósito.')
ON CONFLICT (name) DO UPDATE SET
  max_turnos = EXCLUDED.max_turnos,
  max_staff = EXCLUDED.max_staff,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  description = EXCLUDED.description;
