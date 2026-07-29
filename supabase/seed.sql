-- Seed plan definitions
INSERT INTO plan_definitions (name, max_turnos, max_staff, price_monthly_cents, description)
VALUES
  ('free',     30,     1,      0,     '30 turnos/mes, 1 usuario. Ideal para empezar.'),
  ('pro',      200,    3,      1200,  '200 turnos/mes, 3 usuarios. Alertas y funciones avanzadas.'),
  ('premium',  999999, 999999, 2900,  'Ilimitado. Todo incluido: WhatsApp, recordatorios, depósito.')
ON CONFLICT (name) DO UPDATE SET
  max_turnos = EXCLUDED.max_turnos,
  max_staff = EXCLUDED.max_staff,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  description = EXCLUDED.description;
