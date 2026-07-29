-- ============================================================
-- CRON JOB SETUP — Run AFTER deploying Supabase Edge Functions
-- ============================================================
-- Before running this script:
-- 1. Deploy Edge Functions: supabase functions deploy
-- 2. Replace PROJECT_REF below with your actual Supabase project ref
--    (find it in Supabase Dashboard > Settings > API > Project URL)
-- 3. Set the service_role_key as a Postgres setting:
--    ALTER DATABASE SET "app.settings.service_role_key" = 'your-key-here';

-- Email reminders (daily at 8 AM)
SELECT cron.schedule(
  'send-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);

-- WhatsApp reminders (every 30 minutes)
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
