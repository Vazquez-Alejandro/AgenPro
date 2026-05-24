-- Programar recordatorio diario (ejecutar en SQL Editor)
-- Requiere: pg_cron extension habilitada en Supabase

SELECT cron.schedule(
  'send-reminders',
  '0 8 * * *', -- todos los días a las 8 AM
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
