import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import PushSetup from "@/components/PushSetup";
import ProfileForm from "./ProfileForm";
import VisitForm from "./VisitForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const { data: settings } = await supabase.from("couple_settings").select("next_visit").eq("id", 1).maybeSingle();

  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Logged in as {me.email}</p>
      </header>

      <ProfileForm
        initial={{
          display_name: me.display_name,
          city: me.city,
          latitude: me.latitude,
          longitude: me.longitude,
          timezone: me.timezone,
          quiet_start: me.quiet_start?.slice(0, 5) ?? null,
          quiet_end: me.quiet_end?.slice(0, 5) ?? null,
        }}
      />

      <VisitForm initial={settings?.next_visit ?? null} />

      <PushSetup partnerName={partner?.display_name ?? null} />

      <form action="/api/auth/signout" method="post" className="pt-2 text-center">
        <button className="text-sm text-muted underline">Log out</button>
      </form>
    </div>
  );
}
