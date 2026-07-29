-- ============================================================
-- PERFORMANCE FIXES: Missing indexes
-- ============================================================

-- Index for waitlist queries by tenant + date
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_date
  ON waitlist(tenant_id, date);

-- Index for client_blacklist queries by tenant + phone/email
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_phone
  ON client_blacklist(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_email
  ON client_blacklist(tenant_id, email);

-- Composite index for appointment reminder queries
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_check
  ON appointments(tenant_id, date, status, reminder_24h_sent, reminder_1h_sent)
  WHERE status = 'confirmed' AND client_phone IS NOT NULL;
