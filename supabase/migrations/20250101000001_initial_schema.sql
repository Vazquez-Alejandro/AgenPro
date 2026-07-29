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
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  is_admin BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'owner',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create availability table
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  enabled BOOLEAN DEFAULT true,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  slot_duration INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, day_of_week)
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_availability_tenant_day ON availability(tenant_id, day_of_week);

CREATE POLICY "Tenant admins can manage availability"
  ON availability FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = availability.tenant_id));

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

CREATE POLICY "Tenant admins can manage blocked dates"
  ON blocked_dates FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id));

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  price INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage services"
  ON services FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id));

CREATE POLICY "Anyone can read active services"
  ON services FOR SELECT
  USING (active = true);

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
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);

CREATE POLICY "Users can read own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = appointments.tenant_id));

CREATE POLICY "Users can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
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
