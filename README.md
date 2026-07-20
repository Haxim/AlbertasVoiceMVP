# Alberta's Voice MVP

Two-week MVP for a consent-first Alberta referendum referral workflow. It intentionally avoids becoming a full campaign CRM: captains send one invite, recipients explicitly opt in or decline, and admins use Supabase/Retool/Appsmith for most operations.

## Stack

- Next.js App Router, TypeScript, Tailwind
- Supabase Auth and Postgres with RLS
- Supabase client/server helpers, no ORM
- Twilio SMS invite delivery and STOP webhook
- Resend email invites and broadcasts
- Cloudflare Turnstile on signup and email send forms
- Cloudflare Workers deployable

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the Supabase, Resend, and Turnstile values in `.env.local`.

For current Supabase projects, use the API URL plus the new API keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

The URL must be the project API URL only, not a Supabase dashboard URL and not a URL with `/auth`, `/rest`, or another path.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202605210001_initial_referral_mvp.sql` in the SQL editor or through the Supabase CLI.
3. Copy the project URL, publishable key, and secret key into environment variables.
4. Enable email/password auth in Supabase Auth.
5. Create your first user through `/signup`.
6. Promote the first admin in SQL:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'you@example.com';
```

RLS is enabled. Captains can see only their own invites/subscribers. Admins can see all records. Public invite acceptance uses the server-only service role key because recipients are not authenticated.

For existing databases, also run later migrations in order, especially `202605210004_tighten_captain_rls.sql`, which locks captain visibility to rows tied to their own invite records.

## Cloudflare Deployment

- Use Cloudflare Workers with OpenNext, not static Pages export. This app uses server actions, route handlers, auth cookies, and CSV export.
- Install dependencies, then preview the Worker runtime locally:

```bash
pnpm install
pnpm run preview:cf
```

- Log in and deploy:

```bash
pnpm wrangler login
pnpm run deploy:cf
```

- Add these production plaintext variables in the Cloudflare Worker dashboard:

```text
NEXT_PUBLIC_APP_URL=https://join.albertasvoice.ca
NEXT_PUBLIC_SUPABASE_URL=https://rijwptnrichseefmifjm.supabase.co
INVITE_FROM_EMAIL=Alberta's Voice <invites@albertasvoice.ca>
BROADCAST_FROM_EMAIL=Alberta's Voice <updates@albertasvoice.ca>
```

- Add these production secrets in the Cloudflare Worker dashboard or with Wrangler:

```bash
pnpm wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm wrangler secret put SUPABASE_SECRET_KEY
pnpm wrangler secret put RESEND_API_KEY
pnpm wrangler secret put TWILIO_AUTH_TOKEN
pnpm wrangler secret put NEXT_PUBLIC_TURNSTILE_SITE_KEY
pnpm wrangler secret put TURNSTILE_SECRET_KEY
```

- Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Email Broadcast Setup

Invite emails and the `/admin` broadcast page use Resend. Broadcasts are sent to opted-in subscribers only.

1. Create a Resend account.
2. Verify your sending domain.
3. Add `RESEND_API_KEY`.
4. Set `INVITE_FROM_EMAIL` and `BROADCAST_FROM_EMAIL` to verified sender addresses.
5. Run `supabase/migrations/202605210003_add_email_broadcast_audit.sql`.

Each broadcast is recorded in `broadcasts`, and per-subscriber results are recorded in `broadcast_deliveries`.

Broadcasts process in batches of up to 100 recipients. `wrangler.jsonc` configures a Cloudflare Cron Trigger
(`* * * * *`) and `custom-worker.ts` handles the native scheduled event by advancing incomplete broadcasts in the
background. Set the optional plaintext variable `ADMIN_BROADCAST_CRON_LIMIT` to control how many broadcasts are advanced
per scheduled event; it defaults to 3. The admin page continues to show progress from the `broadcasts` and
`broadcast_deliveries` tables.

## Turnstile Setup

Create a Cloudflare Turnstile widget and add both keys:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

When both values are configured, captain signup, invite sending, and admin email broadcasts require successful human verification.

## Admin Recommendation

Use Supabase table access for deeper internal operations in the first two weeks. The built-in `/admin` page supports counts, audience preview, CSV export, and basic Resend email broadcasts. SMS broadcast tooling is deliberately left out until approvals, segmentation, and audit requirements are clear.

## Tests

```bash
npm test
```

Tests cover duplicate invite prevention, invite acceptance consent validation, preference filtering, captain access checks, and suppression-list behavior.

## Shipping TODOs

- Add a richer broadcast approval workflow after the first MVP validates consent capture and referral flow.
