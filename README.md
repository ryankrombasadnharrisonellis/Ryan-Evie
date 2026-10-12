# Ryan & Evie 💗

A private little PWA for the two of us. Next.js + Supabase + Web Push, hosted on Railway.

## How it fits together
- **Next.js (App Router)** — the app and its API routes (`src/app`).
- **Supabase** — database, login (email + password), realtime and photo storage.
- **Web Push** — `public/sw.js` receives pushes; `src/lib/push.ts` sends them with VAPID keys.
- **Railway** — builds from the `main` branch on every push.

## Environment variables
See `.env.example`. They're set on the Railway `web` service. **Never change the VAPID keys** once phones are subscribed — that breaks every existing subscription.

## Supabase one-time setup
1. **Authentication → Users → Add user → Create new user**: add both emails (tick *Auto Confirm User*).
2. **SQL Editor → New query**: paste `supabase/migrations/001_setup.sql` and run it.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
4. **Authentication → URL Configuration**: set Site URL to the Railway URL.
5. Set each person's password in the SQL editor (login is email + password):
   ```sql
   update auth.users
   set encrypted_password = extensions.crypt('NEW-PASSWORD', extensions.gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now())
   where email = 'someone@example.com';
   ```

## Installing on iPhone (iOS 16.4+)
Open the Railway URL in **Safari** → Share → **Add to Home Screen** → open it from the home screen → log in → **Turn on notifications** → **Test on me**.

## Local development
```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```
