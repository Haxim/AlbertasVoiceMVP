# Alberta's Voice MVP

Two-week MVP for a consent-first Alberta referendum referral workflow. It intentionally avoids becoming a full campaign CRM: captains send one invite, recipients explicitly opt in or decline, and admins use Supabase/Retool/Appsmith for most operations.

## Stack

- Next.js App Router, TypeScript, Tailwind
- Supabase Auth and Postgres with RLS
- Supabase client/server helpers, no ORM
- Twilio SMS invite delivery and STOP webhook
- Optional Resend email invite TODO
- Vercel or Cloudflare Pages deployable

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the Supabase and Twilio values in `.env.local`. If Twilio is not configured, invites are still created and consent links still work.

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

## Twilio Setup

1. Add `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
2. Set either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_PHONE`.
3. Configure the inbound messaging webhook to:

```text
https://your-domain.example/api/twilio/webhook
```

STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, and QUIT add the phone to `suppression_list`, unsubscribe matching subscribers, mark accepted invites unsubscribed, and log consent events.

## Cloudflare Deployment

- Use Cloudflare Workers with OpenNext, not static Pages export. This app uses server actions, route handlers, auth cookies, CSV export, and a Twilio webhook.
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

- Add production secrets in Cloudflare Workers settings or with Wrangler:

```bash
pnpm wrangler secret put NEXT_PUBLIC_APP_URL
pnpm wrangler secret put NEXT_PUBLIC_SUPABASE_URL
pnpm wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm wrangler secret put SUPABASE_SECRET_KEY
pnpm wrangler secret put TWILIO_ACCOUNT_SID
pnpm wrangler secret put TWILIO_AUTH_TOKEN
pnpm wrangler secret put TWILIO_MESSAGING_SERVICE_SID
pnpm wrangler secret put TWILIO_FROM_PHONE
```

- Set `NEXT_PUBLIC_APP_URL` to your Cloudflare production URL or custom domain.
- Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Set the Twilio inbound webhook to `https://your-domain.com/api/twilio/webhook`.

## Admin Recommendation

Use Retool, Appsmith, or Supabase table access for internal operations in the first two weeks. The built-in `/admin` page only shows counts, audience preview, and CSV export. Full broadcast tooling is deliberately a TODO until approvals, segmentation, and audit requirements are clear.

## Tests

```bash
npm test
```

Tests cover duplicate invite prevention, invite acceptance consent validation, preference filtering, captain access checks, and suppression-list behavior.

## Shipping TODOs

- Add Resend email invite delivery once sender domain and templates are ready.
- Add Twilio request-signature verification before public launch if the webhook is exposed beyond Twilio.
- Add formal broadcast provider abstraction after the first MVP validates consent capture and referral flow.
