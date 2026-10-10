# Integrations & Third-Party Accounts

Reference doc: every external service Willow depends on, what it's used for, where its
credentials live, and which account administers it. Willow's own privacy policy
(`/privacy`) names Supabase, Vercel, Stripe, Resend, and Daily.co as sub-processors —
this doc is the operational companion to that list.

Last compiled: 2026-09-10. Verify account/billing-contact details directly with
whoever holds the login — this doc only captures what's inferable from the codebase
and prior verified work, not billing/ownership records.

---

## Supabase

**What it's for:** Postgres database, authentication (including MFA/TOTP), file
storage (client documents, practice logos, consent-form PDFs), and Edge Functions
(server-side code that needs the service-role key — invites, Stripe webhooks).

- **Project:** "Willow v1", project ref `pqlvmqjbjetahbbuxiay`, region `ca-central-1`.
- **Edge functions deployed:** `invite-client`, `invite-staff`, `stripe-webhook`
  (`supabase/functions/`).
- **Env vars (app side, `.env.local` / Vercel):** `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Auth email delivery:** Supabase Auth's SMTP is configured to send through Resend
  (see Resend section) rather than Supabase's default mailer — needed once the app
  moved off `@example.com`/default sending limits to a real domain.
- **RLS:** every tenant-scoped table is multi-tenant via Postgres row-level security
  (`practice_id` scoping), not one Supabase project per practice — see the
  `willow_supabase_multi_tenant_strategy` decision.
- **Account/billing owner:** confirm with whoever holds the Supabase org login.

## Vercel

**What it's for:** hosting and deployment of the Next.js app, including the
`/api/cron/auto-send-invoices` scheduled job.

- **Deployment URLs:** `willow-app-9l8u.vercel.app` (default) and the custom domain
  `willowtherapy.ca` (moved from `willow.sulosystems.com` in October 2026; the old
  address stays as a permanent redirect so emailed payment, consent, portal and
  booking links keep working). Internal server-to-server calls (the Stripe webhook's
  receipt email, the pg_cron jobs) use the `*.vercel.app` address on purpose — it
  doesn't change with the custom domain, and a redirect would drop their
  `Authorization` header.
- **Cron:** `auto-send-invoices` is scheduled from the Vercel dashboard's Cron Jobs
  UI (no `vercel.json` in the repo defines it) — the route itself checks a
  `CRON_SECRET` bearer token so it can't be triggered by anyone else.
- **Env vars:** all `.env.local` vars are mirrored into Vercel's Production
  environment; a var change requires a fresh successful build to take effect (a
  failed build silently keeps serving the last-good deployment — confirmed the hard
  way during the Stripe live-mode migration).
- **Account/billing owner:** confirm with whoever holds the Vercel account/team.

## Namecheap

**What it's for:** domain registrar for `sulosystems.com`, the parent domain for both
the app's custom domain (`willow.sulosystems.com`) and outbound/inbound email
(Resend sending domain, SPF/DKIM/DMARC records, MX records for inbound replies).
Not a code-level integration, but a real dependency — DNS changes here can break
email deliverability or the custom domain.

- **Account/billing owner:** confirm with whoever holds the Namecheap login.

## Stripe

Two distinct, independent usages under one Stripe account family — don't conflate them:

### 1. Platform subscription billing (practices pay Willow)

- Every practice subscribes to the $49/month CAD Willow plan via Stripe Checkout
  (`mode: "subscription"`), managed from **Settings → Billing**.
- **Live since 2026-09-08** on the real account `acct_1U8wdf8nJOCbrtNY`
  ("Sulo Systems Inc."). Previously ran on a sandbox account
  (`acct_1U8wdpG7ffhoiWLE`) during development.
- Product/Price: `price_1UDUq68nJOCbrtNYVZgeeWmh`.
- A 14-day free trial (`practices.trial_ends_at`) precedes the first charge;
  expired-trial practices are gated to a billing-only screen (`/trial-expired`)
  until a practice admin subscribes.
- **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (app), plus
  `STRIPE_WEBHOOK_SECRET` as a Supabase edge function secret (subscription-status
  sync webhook, handled by the `stripe-webhook` edge function).

### 2. Per-practice Stripe Connect (clients pay practices directly)

- Each practice can optionally connect its **own** Stripe account (Standard Connect,
  `settings/integrations` → `connectStripe()`), so client invoice payments
  (`/pay/[token]`) and saved cards go straight to the practice, not through Willow.
- **Env var:** `STRIPE_CONNECT_WEBHOOK_SECRET` as a Supabase edge function secret
  (a second webhook endpoint, `connect: true`, pointed at the same `stripe-webhook`
  edge function).
- **Known open item:** Therapy by Niha's Connect account (`acct_1UDH2q506PKMlv3p`)
  was set up in test mode and stopped working the moment the platform key went
  live (test/live Stripe accounts are separate namespaces) — she needs to redo
  Connect onboarding for real. Any practice that connected before 2026-09-08 is in
  the same situation.
- **Account/billing owner (platform side):** confirm with whoever holds the Stripe
  account login. Per-practice Connect accounts are owned by each practice, not Willow.

## Resend

**What it's for:** all transactional email, in two separate configurations under the
same vendor:

1. **App-level sending** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) — appointment
   reminders, booking-request notices, invoice emails, consent-form signing links,
   message notifications, MFA-related emails. Sent via `src/utils/resend/send.ts`.
2. **Supabase Auth's custom SMTP provider** — signup confirmation, portal/staff
   invites, and password-reset emails, configured directly in the Supabase
   dashboard (not an app env var), also routed through Resend. Unlike category 1,
   these use Supabase's own (dashboard-edited) email templates, not the app's
   React/HTML ones -- the `invite-staff`/`invite-client` edge functions pass
   `practice_name`/`practice_logo_url`/`invite_type` as `user_metadata` on the
   invited user so the dashboard template can render `{{ .Data.practice_name }}`
   / `{{ .Data.practice_logo_url }}` for that practice's own branding.
3. **Inbound email** — clients can reply to a Willow email and have it land back in
   the app as a portal message, via `RESEND_WEBHOOK_SECRET` +
   `INBOUND_EMAIL_DOMAIN` and the `/api/webhooks/resend-inbound` route.

- **Sending domain:** migrated from a placeholder domain to `sulosystems.com` on
  2026-09-07 (both the app-level sends and the Supabase Auth SMTP config), then to
  `willowtherapy.ca` (sending) and `reply.willowtherapy.ca` (inbound replies) in
  October 2026. The inbound webhook still accepts `reply.sulosystems.com` so replies
  to emails sent before the move keep landing in the right thread.
- **QA gotcha:** Resend rejects sends to `@example.com` addresses — don't mistake
  that for a real SMTP outage when testing.
- **Account/billing owner:** confirm with whoever holds the Resend account login.

## Daily.co

**What it's for:** telehealth video rooms for appointments (private room + waiting
lobby via "knocking", auto-ends 15 minutes past the scheduled appointment time).

- **Not a platform-wide Willow account** — each practice supplies its **own** Daily
  API key under **Settings → Integrations** (`practice_video_settings.daily_api_key`,
  set via `saveDailyApiKey()`). If a practice hasn't configured one, video features
  are silently unavailable for that practice's appointments (by design — never
  blocks appointment creation).
- Room/token creation calls the Daily REST API directly (`src/utils/daily/create-room.ts`),
  no SDK dependency.
- **Account/billing owner:** each individual practice owns its own Daily.co account
  and API key — not centrally administered by Willow/Sulo Systems.

## GitHub

**What it's for:** source control and deployment trigger (Vercel deploys on push).

- **Repo:** `sadeedbari/willow-app`.
- **Account/billing owner:** confirm with whoever holds the GitHub org/account.

---

## Quick-reference table

| Integration | Used for | Credentials live in | Scope |
|---|---|---|---|
| Supabase | DB, auth, storage, edge functions | `.env.local` / Vercel env | Platform-wide |
| Vercel | Hosting, deployment, cron | Vercel dashboard | Platform-wide |
| Namecheap | DNS, domain registration | Namecheap account | Platform-wide |
| Stripe (platform) | Practice → Willow subscription billing | `.env.local` / Vercel env + edge function secrets | Platform-wide |
| Stripe Connect | Client → practice payments | Per-practice, via Settings → Integrations | Per-practice |
| Resend (app) | Transactional email | `.env.local` / Vercel env | Platform-wide |
| Resend (Auth SMTP) | Signup/invite/reset emails | Supabase dashboard | Platform-wide |
| Daily.co | Telehealth video | Per-practice, via Settings → Integrations | Per-practice |
| GitHub | Source control | GitHub | Platform-wide |
