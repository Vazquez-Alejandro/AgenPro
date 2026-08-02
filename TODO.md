# AgenPro — TODO de Produccion

## Bugs corregidos (Audit 2026-08-01)
- [x] `change-plan/route.ts`: Fix column names (`turnos_limit` → `appointments_limit`, `max_turnos` → `appointments_limit`, `max_staff` → `staff_limit`)
- [x] `change-plan/route.ts`: Fix query by `key` instead of `name` (plan_definitions PK is `key`)
- [x] `appointments/route.ts`: Fix column name (`turnos_limit` → `appointments_limit`)
- [x] `public-appointments/route.ts`: Fix column name (`turnos_limit` → `appointments_limit`)
- [x] `types/index.ts`: Fix `turnos_limit` → `appointments_limit`
- [x] `RegisterContent.tsx`: Fix `turnos_limit` → `appointments_limit`
- [x] `SettingsContent.tsx`: Fix `turnos_limit` → `appointments_limit`

## Pendiente
- [ ] **Configurar Stripe** — `STRIPE_SECRET_KEY` es placeholder (`your_stripe_secret_key`)
- [ ] **Configurar Twilio** — `TWILIO_ACCOUNT_SID` es placeholder
- [ ] **Configurar MercadoPago webhook** — No hay endpoint de webhook para MercadoPago
- [ ] **Rate limiting** — Usa Map en memoria que se resetea en cold start de Vercel. Considerar usar Redis o Upstash
- [ ] **cancel-appointment es GET** — Operación de cambio de estado que debería ser POST (problema de diseño, no bug crítico ya que usa tokens)
- [ ] **Dominio Resend** — Verificar `agenpro.app` en Resend para emails
- [ ] **NEXT_PUBLIC_ORIGIN** — Cambiar de `localhost:3000` a URL de producción en Vercel

## Marketing
- [ ] Crear post de lanzamiento para redes sociales
- [ ] Configurar Google Analytics / Umami
- [ ] Crear demo video walkthrough

## Technical improvements
- [ ] Add error tracking (Sentry)
- [ ] Add request logging
- [ ] Add health check endpoint
- [ ] Consider adding MercadoPago webhook endpoint
- [ ] Add input validation/sanitization
