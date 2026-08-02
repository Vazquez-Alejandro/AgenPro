# AgenPro — TODO de Producción

## Bugs corregidos (Audit 2026-08-01)
- [x] `change-plan/route.ts`: Fix column names (`turnos_limit` → `appointments_limit`)
- [x] `change-plan/route.ts`: Fix query by `key` instead of `name`
- [x] `appointments/route.ts`: Fix column name
- [x] `public-appointments/route.ts`: Fix column name
- [x] `types/index.ts`: Fix `turnos_limit` → `appointments_limit`
- [x] `RegisterContent.tsx`: Fix column name
- [x] `SettingsContent.tsx`: Fix column name

## Fixes aplicados (2026-08-02)
- [x] **vercel.json** — Creado para deploy en Vercel
- [x] **MercadoPago webhook** — Creado `/api/mercadopago-webhook`
- [x] **.env.example** — Agregadas variables faltantes (MP_WEBHOOK_SECRET, NEXT_PUBLIC_MERCADO_PAGO_KEY)

## Pendiente (tu parte)

### Crítico (antes de lanzar)
- [ ] **Configurar Stripe** — Reemplazar `your_stripe_secret_key` y `your_stripe_publishable_key` en Vercel
- [ ] **Configurar Twilio** — Reemplazar `your_twilio_account_sid` y `your_twilio_auth_token` en Vercel
- [ ] **Configurar NEXT_PUBLIC_ORIGIN** — Cambiar `localhost:3000` por `https://agenpro.vercel.app` en Vercel
- [ ] **Configurar MP_WEBHOOK_SECRET** — Agregar en Vercel dashboard
- [ ] **Configurar Stripe webhook** — Crear webhook en Stripe dashboard apuntando a `/api/stripe-webhook`

### Importante
- [ ] **Dominio Resend** — Verificar `agenpro.app` en Resend para emails
- [ ] **Rate limiting** — Usa Map en memoria (resetea en cold start). Considerar Upstash Redis
- [ ] **cancel-appointment es GET** — Debería ser POST (diseño, no bug crítico)

### Marketing
- [ ] Crear post de lanzamiento para redes sociales
- [ ] Configurar Google Analytics / Umami
- [ ] Crear demo video walkthrough

### Técnico
- [ ] Add error tracking (Sentry)
- [ ] Add health check endpoint
- [ ] Add input validation/sanitization
