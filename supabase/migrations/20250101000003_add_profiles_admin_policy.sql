-- Allow admins to read all profiles (avoids infinite recursion from self-referencing policy)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin = true);
