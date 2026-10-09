"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isIOS, isStandalone, iosVersion } from "@/lib/pwa";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-5 w-5 -translate-y-0.5 text-sky" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function PlusSquare() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-5 w-5 -translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export default function InstallPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ios" | "ios-old" | "not-safari" | "other">("loading");

  useEffect(() => {
    if (isStandalone()) {
      router.replace("/");
      return;
    }
    if (!isIOS()) return setState("other");
    const v = iosVersion();
    if (v !== null && v < 16.4) return setState("ios-old");
    // Chrome/Firefox on iOS show "CriOS"/"FxiOS" — Add to Home Screen works best from Safari
    if (/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)) return setState("not-safari");
    setState("ios");
  }, [router]);

  return (
    <div className="flex min-h-[90dvh] flex-col justify-center gap-6 animate-fadeIn">
      <div className="text-center">
        <img src="/icon-192.png" alt="" className="mx-auto mb-4 h-20 w-20 rounded-3xl shadow-soft" />
        <h1 className="font-display text-3xl font-semibold">Ryan &amp; Evie</h1>
        <p className="mt-1 text-muted">Let&apos;s put our little app on your home screen.</p>
      </div>

      {state === "ios" && (
        <ol className="card space-y-4 text-[17px]">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose/15 font-bold text-rose">1</span>
            <span>Tap the <b>Share</b> button <ShareIcon /> at the bottom of Safari (or under the <b>•••</b> menu).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose/15 font-bold text-rose">2</span>
            <span>Scroll down and tap <b>Add to Home Screen</b> <PlusSquare />.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose/15 font-bold text-rose">3</span>
            <span>Make sure <b>Open as Web App</b> is on, then tap <b>Add</b>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose/15 font-bold text-rose">4</span>
            <span>Close Safari and open <b>Ryan &amp; Evie</b> from your home screen. You&apos;ll log in and turn on notifications there.</span>
          </li>
        </ol>
      )}

      {state === "not-safari" && (
        <div className="card text-center">
          <p>Please open this page in <b>Safari</b> — that&apos;s the browser that can add it to your home screen with notifications.</p>
        </div>
      )}

      {state === "ios-old" && (
        <div className="card text-center">
          <p>Notifications need <b>iOS 16.4 or newer</b>. Update your iPhone in Settings → General → Software Update, then come back here.</p>
        </div>
      )}

      {state === "other" && (
        <div className="card space-y-3 text-center">
          <p>This app is made for iPhone. On a computer you can still use it in the browser.</p>
          <button className="btn-primary w-full" onClick={() => router.push("/login")}>Continue in browser</button>
        </div>
      )}

      {state === "loading" && <div className="h-40" />}
    </div>
  );
}
