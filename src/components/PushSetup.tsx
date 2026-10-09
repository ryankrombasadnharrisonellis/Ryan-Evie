"use client";
import { useEffect, useRef, useState } from "react";
import { enablePush, isIOS, isStandalone, pushSupported, resyncPush } from "@/lib/pwa";
import Hearts, { type HeartsHandle } from "@/components/Hearts";

type Status = "checking" | "needs-install" | "unsupported" | "off" | "denied" | "on";

export default function PushSetup({ partnerName }: { partnerName: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const hearts = useRef<HeartsHandle>(null);

  useEffect(() => {
    (async () => {
      if (isIOS() && !isStandalone()) return setStatus("needs-install");
      if (!pushSupported()) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("denied");
      if (Notification.permission === "granted") {
        const ok = await resyncPush();
        return setStatus(ok ? "on" : "off");
      }
      setStatus("off");
    })();
  }, []);

  async function turnOn() {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    if (r === "granted") {
      setStatus("on");
      hearts.current?.burst(10);
    } else if (r === "denied") setStatus("denied");
    else if (r === "unsupported") setStatus("unsupported");
    else setMsg("Something went wrong saving this phone. Try again?");
  }

  async function test(to: "me" | "partner") {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = (await res.json()) as { delivered?: number; error?: string };
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "Couldn't send.");
    if (!data.delivered) {
      setMsg(to === "me" ? "No devices registered for you yet." : `${partnerName ?? "They"} hasn't turned on notifications yet.`);
    } else {
      setMsg(to === "me" ? "Sent! Lock your phone — it should pop up in a second." : `Sent to ${partnerName} 💌`);
      hearts.current?.burst(6);
    }
  }

  return (
    <div className="card space-y-4 animate-fadeIn">
      <Hearts ref={hearts} />
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔔</span>
        <div>
          <h2 className="font-display text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted">
            {status === "checking" && "Checking…"}
            {status === "on" && "On for this phone ✓"}
            {status === "off" && "So you know when you're being thought of."}
            {status === "denied" && "Notifications are blocked for this app."}
            {status === "unsupported" && "This browser can't do push notifications."}
            {status === "needs-install" && "Add the app to your home screen first."}
          </p>
        </div>
      </div>

      {status === "off" && (
        <button className="btn-primary w-full" onClick={turnOn} disabled={busy}>
          {busy ? "One sec…" : "Turn on notifications"}
        </button>
      )}

      {status === "denied" && (
        <p className="text-sm">
          Open your iPhone <b>Settings → Notifications → Ryan &amp; Evie</b> and switch on <b>Allow Notifications</b>, then come back.
        </p>
      )}

      {status === "needs-install" && (
        <a href="/install" className="btn-primary w-full">Show me how</a>
      )}

      {status === "on" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => test("me")} disabled={busy}>Test on me</button>
          <button className="btn-ghost" onClick={() => test("partner")} disabled={busy || !partnerName}>
            Test {partnerName ?? "partner"}
          </button>
        </div>
      )}

      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </div>
  );
}
