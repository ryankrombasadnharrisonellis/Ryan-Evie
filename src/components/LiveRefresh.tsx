"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["pings", "notes", "goodnights", "moods", "question_answers", "couple_settings", "profiles"];

/** Keeps the screen fresh: refreshes when the other person does something, when a push arrives, or when the app is reopened. */
export default function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
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
