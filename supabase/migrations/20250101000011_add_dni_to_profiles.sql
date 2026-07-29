-- Add DNI field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dni TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON profiles(dni);
