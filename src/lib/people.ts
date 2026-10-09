import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  quiet_start: string | null;
  quiet_end: string | null;
  onboarded: boolean;
};

/** Returns the logged-in person and their partner (the only other profile). */
export async function getMeAndPartner(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { me: null, partner: null };
  const { data } = await supabase.from("profiles").select("*");
  const profiles = (data ?? []) as Profile[];
  const me = profiles.find((p) => p.id === user.id) ?? null;
  const partner = profiles.find((p) => p.id !== user.id) ?? null;
  return { me, partner };
}
