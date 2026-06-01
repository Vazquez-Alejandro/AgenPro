-- 1. Allow 'client' role in profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'admin', 'staff', 'client'));

-- 2. Custom fields definition per tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Custom field values stored on each profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Allow clients to read their own and be read by their tenant's admins
DROP POLICY IF EXISTS "Clients can read own profile" ON profiles;
CREATE POLICY "Clients can read own profile"
  ON profiles FOR SELECT USING (
    auth.uid() = id
    OR (
      role = 'client'
      AND tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );
