"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isIOS, isStandalone } from "@/lib/pwa";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On iPhone, log in from the home-screen app (Safari and the app keep separate logins).
  useEffect(() => {
    if (isIOS() && !isStandalone()) router.replace("/install");
  }, [router]);

  async function logIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setBusy(false);
      setError(
        /invalid login credentials/i.test(error.message)
          ? "That email and password don't match. (This app is just for Ryan and Evie 💛)"
          : error.message
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[90dvh] flex-col justify-center gap-6 animate-fadeIn">
      <div className="text-center">
        <img src="/icon-192.png" alt="" className="mx-auto mb-4 h-20 w-20 rounded-3xl shadow-soft" />
        <h1 className="font-display text-3xl font-semibold">Hello you</h1>
        <p className="mt-1 text-muted">Log in once and you&apos;ll stay logged in.</p>
      </div>

      <form onSubmit={logIn} className="card space-y-3">
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn-primary w-full" disabled={busy || !email || !password}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
