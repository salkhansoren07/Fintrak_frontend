# FinTrak Frontend

Next.js frontend for FinTrak. This app renders the landing page and dashboard UI while the standalone backend owns the secure API surface.

## Current Architecture

- `app/` contains the Next.js App Router UI.
- Browser-side requests go through `app/lib/apiClient.js` to the backend defined by `NEXT_PUBLIC_API_BASE_URL`.
- Server-rendered homepage requests use `app/lib/serverApi.js` to fetch session and public data from the backend.
- The frontend no longer owns local auth, password-reset, or observability API routes.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

## Local Development

1. Start the backend on `http://localhost:4000`.
2. Set `frontend/.env.local` with at least:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

3. Start the frontend:

```bash
npm run dev
```

The app will run on [http://localhost:3000](http://localhost:3000).

## Production Setup

Recommended deployment:

- Frontend: Vercel on `https://www.fintrak.online` or `https://app.fintrak.online`
- Backend: Render or custom API host

Required frontend environment variables depend on how you render and deploy the app.

### Needed for backend-connected app behavior

- `NEXT_PUBLIC_API_BASE_URL`
- `API_BASE_URL` (recommended for server-rendered requests)

### Optional observability settings

- `OBSERVABILITY_LOG_LEVEL`
- `OBSERVABILITY_WEBHOOK_URL`

## Notes

- The standalone backend owns login, signup, session, Gmail sync, passcode, password reset, observability, user-data, testimonials, and AI routes.
- The remaining server-side logic in `frontend` is limited to Next.js rendering concerns such as `serverApi.js`.
