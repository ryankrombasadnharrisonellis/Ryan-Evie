# Ryan & Evie 💗

A private little PWA for the two of us. Next.js + Supabase + Web Push, hosted on Railway.

## How it fits together
- **Next.js (App Router)** — the app and its API routes (`src/app`).
- **Supabase** — database, login (6-digit email code), realtime and photo storage.
- **Web Push** — `public/sw.js` receives pushes; `src/lib/push.ts` sends them with VAPID keys.
- **Railway** — builds from the `main` branch on every push.

## Environment variables
See `.env.example`. They're set on the Railway `web` service. **Never change the VAPID keys** once phones are subscribed — that breaks every existing subscription.

## Supabase one-time setup
1. **SQL Editor → New query**: paste `supabase/migrations/001_setup.sql` and run it.
2. **Authentication → Users → Add user → Create new user**: add both emails, tick *Auto Confirm User*.
3. **Authentication → Sign In / Providers → Email**: keep Email enabled. Then under **User Signups** turn **off** "Allow new users to sign up".
4. **Authentication → Emails → Templates → Magic Link**: replace the body with the code template below so the email contains a 6-digit code instead of a link.
5. **Authentication → URL Configuration**: set Site URL to the Railway URL.

Magic Link email template:
```html
<h2>Your Ryan & Evie code</h2>
<p style="font-size:32px;letter-spacing:6px;font-weight:bold">{{ .Token }}</p>
<p>Type this into the app. It expires in an hour.</p>
```

## Installing on iPhone (iOS 16.4+)
Open the Railway URL in **Safari** → Share → **Add to Home Screen** → open it from the home screen → log in → **Turn on notifications** → **Test on me**.

## Local development
```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```
