"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isIOS, isStandalone } from "@/lib/pwa";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // On iPhone, log in from the home-screen app (Safari and the app keep separate logins).
  useEffect(() => {
    if (isIOS() && !isStandalone()) router.replace("/install");
  }, [router]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      setError(
        /signups? not allowed|not found|private/i.test(error.message)
          ? "This app is just for Ryan and Evie 💛"
          : error.message
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("That code didn't work — check it or send a new one.");
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
        <p className="mt-1 text-muted">
          {step === "email" ? "We'll email you a code to log in." : `We sent a code to ${email}.`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="card space-y-3">
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
          <button className="btn-primary w-full" disabled={busy || !email}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="card space-y-3">
          <input
            ref={codeRef}
            className="input text-center font-display text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          <button className="btn-primary w-full" disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Log in"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted underline"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
          >
            Use a different email or resend
          </button>
        </form>
      )}

      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
