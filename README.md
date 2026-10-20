# Veloura — Perfume Shop

A responsive Next.js storefront with white/beige minimalist design, product filters, cart, checkout form, server-side order validation, Supabase order storage, COD, and a PayMongo hosted-checkout starter.

## Important
This is a starter project, not yet production-hardened. COD orders save to Supabase once configured. PayMongo checkout creation is included, but before real launch you must implement and verify PayMongo webhooks so orders are marked paid only after verified payment. A success redirect alone does not prove payment. Admin dashboard, stock management, email/SMS notifications, shipping charges, privacy policy and return policies are not included.

## Run locally
Install Node.js 20+, then:
```bash
npm install
```
Copy `.env.example` to `.env.local` (PowerShell: `Copy-Item .env.example .env.local`) and run:
```bash
npm run dev
```
Open http://localhost:3000. The storefront UI runs without credentials; order placement needs Supabase.

## Supabase database
1. Create a project at https://supabase.com.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy Project URL and public/anon key from project settings.
4. Copy the service-role key for server-side use only. Never expose it with `NEXT_PUBLIC_` or commit it.
5. Set `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Online payments
1. Create/verify a PayMongo account.
2. Start with a test secret key (`sk_test_...`).
3. Set `PAYMONGO_SECRET_KEY` in `.env.local`.
4. The route creates a hosted checkout session for GCash, QR Ph, and cards.
5. Before using live keys, implement a verified PayMongo webhook that updates `payment_status` only after a verified payment event.

Official guide: https://docs.paymongo.com/docs/payment-channels-hosted-checkout

## Deploy to Vercel
1. Push the project to a GitHub repository.
2. In Vercel select Add New → Project and import that repository.
3. Under Project → Settings → Environment Variables add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMONGO_SECRET_KEY` (optional while COD-only), and `NEXT_PUBLIC_SITE_URL` set to your deployed HTTPS URL.
4. Deploy/redeploy after setting variables.
5. Test a COD order and verify it appears in Supabase. Then test PayMongo in test mode.

Official guides:
- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://vercel.com/docs/environment-variables

## Current limits
Products and prices are currently fixed in `components/Shop.tsx` and validated server-side. There is no admin product editor. Free-shipping messaging is shown but shipping is not added to the total. Payment webhooks are not implemented, so do not treat online orders as paid until you add webhook verification.
