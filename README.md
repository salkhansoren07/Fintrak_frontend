


working properly












This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Fintrack

## FinTrak account and Gmail sync setup (Supabase + Vercel)

This app now supports:

- FinTrak username/email + password accounts
- one-time Gmail connection with a stored refresh token
- synced category overrides per FinTrak user

### 1. Create Supabase table

Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.fintrak_users (
  id text primary key,
  username text not null unique,
  email text unique,
  password_hash text not null,
  passcode_hash text,
  is_admin boolean not null default false,
  gmail_refresh_token text,
  gmail_email text,
  gmail_subject text,
  category_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2. Add environment variables

Set these in Vercel Project -> Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_SESSION_SECRET` (recommended, but the app can fall back to the server secret in development)
- `OBSERVABILITY_LOG_LEVEL` (`info` by default; supports `debug`, `info`, `warn`, `error`)
- `OBSERVABILITY_WEBHOOK_URL` (optional; forwards structured warn/error events to your monitoring webhook)
- `GROQ_API_KEY` (optional; enables Groq-powered transaction insights on the dashboard)
- `GROQ_MODEL` (optional; defaults to `openai/gpt-oss-20b`)
- `RESEND_API_KEY` (required for forgot-password email delivery)
- `PASSWORD_RESET_EMAIL_FROM` (recommended sender address for forgot-password emails)
- `EMAIL_FROM_ADDRESS` (optional fallback if `PASSWORD_RESET_EMAIL_FROM` is not set)

Google OAuth scopes required by this app:

- `https://www.googleapis.com/auth/gmail.readonly`
- `openid`
- `email`
- `profile`

For local development, add the same keys to `.env.local`.

### 3. Google OAuth redirect URI

Add these Google OAuth redirect URIs in Google Cloud:

- `http://localhost:3000/api/auth/google/callback`
- `https://www.fintrak.online/api/auth/google/callback`

### 4. Flow

1. User signs up with FinTrak username/email + password
2. User signs in to FinTrak
3. User connects Gmail once from inside the authenticated app
4. FinTrak stores the Gmail refresh token securely on the server
5. Future sign-ins use only FinTrak credentials unless Gmail access is revoked

### 5. Redeploy

After adding environment variables, redeploy the app from Vercel.

## Observability guide

The app now emits structured server and client observability events. In production, start by collecting `warn` and `error` events and forwarding them to your log platform or alert webhook.

### Watch first

- `auth.login.user_lookup_failed`
- `auth.signup.create_failed`
- `auth.session.user_lookup_failed`
- `auth.google_callback.profile_read_failed`
- `auth.google_callback.profile_write_failed`
- `gmail.sync.failed`
- `gmail.sync.rate_limited`
- `user_data.write.supabase_update_failed`
- `account.delete.failed`
- `account.delete.gmail_revoke_failed`
- `passcode.save.failed`
- `passcode.verify.unexpected_error`
- `transactions.sync_failed`
- `transactions.gmail_auth_error`

### Recommended alert rules

- Alert immediately on any spike in `auth.login.unexpected_error`, `auth.signup.unexpected_error`, or `auth.session.user_lookup_failed`.
- Alert immediately on any `gmail.sync.failed` burst, especially if paired with `auth.google_callback.*` failures.
- Alert when `gmail.sync.rate_limited` appears repeatedly over a short window, since users may start seeing stale transaction data.
- Alert on any `user_data.write.supabase_update_failed` or repeated `budget.save_failed` events, because users may think data is safely synced when it is not.
- Alert on any `account.delete.failed` event, since account deletion should be highly reliable.
- Review `transactions.gmail_auth_error` and `auth.google_callback.refresh_token_missing` daily, because they indicate reconnect friction in a core flow.

### Good first dashboard

- Auth errors by event name
- Gmail sync errors vs rate limits
- Supabase profile read/write failures
- Account deletion failures
- Client-side session refresh failures

## Real testimonials setup

The homepage now supports real, approved testimonials from Supabase instead of hardcoded sample quotes.

Create this table in the Supabase SQL editor:

```sql
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  email text,
  role text,
  location text,
  quote text not null,
  avatar_url text,
  consent_to_publish boolean not null default false,
  approved boolean not null default false,
  featured boolean not null default false,
  reviewed_at timestamptz,
  rejected_at timestamptz,
  submission_source text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_homepage_idx
  on public.testimonials (approved, featured, sort_order, created_at desc);

create index if not exists testimonials_user_lookup_idx
  on public.testimonials (user_id, created_at desc);
```

If your tables already exist, run these safe upgrades too:

```sql
alter table public.fintrak_users
  add column if not exists is_admin boolean not null default false;

alter table public.testimonials
  add column if not exists user_id text,
  add column if not exists email text,
  add column if not exists consent_to_publish boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists submission_source text,
  add column if not exists updated_at timestamptz not null default now();
```

Recommended publishing workflow:

- Collect explicit permission from the user before publishing their quote.
- Insert rows with `approved = false` until you review them.
- Set `approved = true` for any testimonial you want to show publicly.
- Use `featured = true` and `sort_order` to control which testimonials appear first.
- Logged-in users can submit feedback in-app from the profile page. These submissions stay private until approved.
- Admin users can review submissions inside the app at `/admin/testimonials`.

To grant an account admin access:

```sql
update public.fintrak_users
set is_admin = true
where email = 'you@example.com';
```

If the table is empty, the homepage shows a safe "share feedback" call-to-action instead of fake testimonials.

## Forgot password setup

The app now includes a full forgot-password flow:

- `Forgot password?` link on the login screen
- `/forgot-password` request page
- `/reset-password?token=...` password reset page
- one-time, hashed reset tokens with 20-minute expiry
- Resend email delivery scaffold for reset emails

Create this table in the Supabase SQL editor:

```sql
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_idx
  on public.password_reset_tokens (user_id, created_at desc);

create index if not exists password_reset_tokens_token_idx
  on public.password_reset_tokens (token_hash);
```

If your project already has the table, this safe upgrade is enough:

```sql
alter table public.password_reset_tokens
  add column if not exists requested_ip text,
  add column if not exists used_at timestamptz,
  add column if not exists created_at timestamptz not null default now();
```

How it works:

1. User enters their email on `/forgot-password`.
2. The server rate limits requests by email and IP.
3. If the account exists, existing reset tokens for that user are cleared.
4. A new token is generated, hashed, and stored in `password_reset_tokens`.
5. The user receives a reset link by email.
6. `/reset-password` accepts the token once, updates `fintrak_users.password_hash`, and deletes remaining reset tokens for that user.

Security notes:

- The request form returns the same success message whether or not the email exists.
- Reset tokens are stored hashed, not in plain text.
- Reset links expire after 20 minutes and can be used only once.
- The request endpoint is throttled to reduce abuse.
