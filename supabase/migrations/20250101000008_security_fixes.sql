-- ============================================================
-- SECURITY FIXES: RLS, auth, data privacy
-- ============================================================

-- 1. Fix appointments: restrict SELECT to own data + tenant members
--    (replaces the wide-open "Anyone can read appointments" policy)
DROP POLICY IF EXISTS "Anyone can read appointments" ON appointments;
DROP POLICY IF EXISTS "Users can read own appointments" ON appointments;
CREATE POLICY "Users can read own appointments"
  ON appointments FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE tenant_id = appointments.tenant_id
    )
  );

-- 2. Fix appointments INSERT: require authenticated user
--    (replaces the wide-open "WITH CHECK (true)" policy)
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
CREATE POLICY "Authenticated users can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix profiles: admin read policy must be tenant-scoped
--    (replaces the global admin read policy)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read own profile and tenant profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (
      is_admin = true
      AND tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- 4. Enable RLS on plan_definitions (was missing)
ALTER TABLE plan_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan definitions"
  ON plan_definitions FOR SELECT
  USING (true);

-- 5. Add DELETE policies for tenant-scoped tables
CREATE POLICY "Tenant admins can delete services"
  ON services FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE tenant_id = services.tenant_id
  ));

CREATE POLICY "Tenant admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE tenant_id = blocked_dates.tenant_id
  ));

CREATE POLICY "Tenant admins can delete blacklist entries"
  ON client_blacklist FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE tenant_id = client_blacklist.tenant_id
  ));
