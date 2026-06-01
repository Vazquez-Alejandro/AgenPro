-- Replace old plan definitions with new market-aligned tiers
DELETE FROM plan_definitions;

INSERT INTO plan_definitions (name, max_turnos, max_staff, price_monthly_cents, description)
VALUES
  ('free',       30,     1,      0,     'Prueba gratis: 30 turnos/mes, 1 profesional. Notificaciones por email.'),
  ('inicial',    100,    1,      1200,  '1 calendario, agenda básica, notificaciones automáticas (email + WhatsApp). Ideal para profesionales independientes.'),
  ('profesional',500,    5,      3000,  'Múltiples agendas independientes, reportes de facturación, gestión de clientes, recordatorios WhatsApp personalizados.'),
  ('premium',    999999, 999999, 7500,  'Control de stock, integración con pasarelas de pago (seña), soporte prioritario. Sin límites.')
ON CONFLICT (name) DO NOTHING;
