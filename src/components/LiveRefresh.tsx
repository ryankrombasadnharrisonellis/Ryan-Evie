"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["pings", "notes", "goodnights", "moods", "question_answers", "couple_settings", "profiles", "games", "word_results", "photo_swaps", "sos"];

/** Keeps the screen fresh: refreshes when the other person does something, when a push arrives, or when the app is reopened. */
async function syncAppBadge() {
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    const { count } = (await fetch("/api/badge", { cache: "no-store" }).then((r) => r.json())) as { count: number };
    if (count > 0) await nav.setAppBadge(count);
    else await nav.clearAppBadge?.();
  } catch {}
}

export default function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  // Opening Notes or a game can clear things, so re-check the icon badge on every screen change.
  useEffect(() => {
    const t = setTimeout(syncAppBadge, 1200);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        router.refresh();
        setTimeout(syncAppBadge, 800);
      }, 250);
    };


    const supabase = createClient();
    const channel = supabase.channel("live-updates");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onSwMessage = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [router]);
  return null;
}
