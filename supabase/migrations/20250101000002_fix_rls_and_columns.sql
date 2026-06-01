-- Add missing columns to appointments (used by existing code)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service TEXT;

-- Fix tenants RLS (was enabled with zero policies — blocks everything)
CREATE POLICY "Anyone can read tenants"
  ON tenants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tenants"
  ON tenants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id));

-- Fix availability: add public SELECT + fix admin policy WITH CHECK
CREATE POLICY "Anyone can read availability"
  ON availability FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage availability" ON availability;
CREATE POLICY "Tenant admins can manage availability"
  ON availability FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = availability.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = availability.tenant_id));

-- Fix blocked_dates: add public SELECT + fix admin policy WITH CHECK
CREATE POLICY "Anyone can read blocked dates"
  ON blocked_dates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage blocked dates" ON blocked_dates;
CREATE POLICY "Tenant admins can manage blocked dates"
  ON blocked_dates FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id));

-- Fix services: fix admin policy WITH CHECK
DROP POLICY IF EXISTS "Tenant admins can manage services" ON services;
CREATE POLICY "Tenant admins can manage services"
  ON services FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = services.tenant_id));

-- Fix appointments: add public SELECT for slot checking
CREATE POLICY "Anyone can read appointments"
  ON appointments FOR SELECT
  USING (true);
