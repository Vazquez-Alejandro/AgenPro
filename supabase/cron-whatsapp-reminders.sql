-- Programar recordatorio por WhatsApp cada 30 minutos
-- Requiere: pg_cron extension habilitada en Supabase

SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/30 * * * *', -- cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
