# AgenPro

Sistema de reserva de turnos online para negocios.

## Features

- Multi-tenant architecture
- Online booking with calendar
- Stripe & Mercado Pago integration
- WhatsApp notifications (Twilio)
- Admin panel with agenda, services, availability
- Client dashboard
- Subscription plans (Free, Inicial, Profesional, Premium)
- i18n (Spanish + English)

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Auth + RLS)
- **Payments:** Stripe, Mercado Pago
- **Notifications:** Twilio (WhatsApp), Resend (Email)
- **Deploy:** Vercel, Supabase Edge Functions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `MERCADO_PAGO_ACCESS_TOKEN` — Mercado Pago access token
- `TWILIO_ACCOUNT_SID` — Twilio account SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` — Twilio WhatsApp number
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — Sender email address

## Deploy

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Deploy Supabase Edge Functions
supabase functions deploy

# Setup cron jobs (run in Supabase SQL Editor)
# See supabase/cron-setup.sql
```

## License

Private
