"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { notify } from "@/lib/notify";
import { ownsPath } from "@/lib/media";
import { todayPDate } from "@/lib/photos";

type Result = { ok: true } | { ok: false; error: string };

export async function postPhoto(path: string, caption: string): Promise<Result> {
  try {
    const supabase = await createClient();
    const { me, partner } = await getMeAndPartner(supabase);
    if (!me) return { ok: false, error: "Not logged in" };
    if (!ownsPath(me.id, path)) return { ok: false, error: "Upload failed — try again." };
    const pdate = todayPDate();
    const admin = createAdminClient();
    const { error } = await admin
      .from("photo_swaps")
      .insert({ user_id: me.id, pdate, path, caption: caption.trim().slice(0, 140) || null });
    if (error) return { ok: false, error: /duplicate/i.test(error.message) ? "You've already posted today's photo." : error.message };

    if (partner) {
      const { data: theirs } = await admin.from("photo_swaps").select("id").eq("user_id", partner.id).eq("pdate", pdate).maybeSingle();
      after(() =>
        notify(partner.id, {
          title: theirs ? "📸 Today's photos are unlocked!" : `📸 ${me.display_name} posted today's photo`,
          body: theirs ? `See what ${me.display_name}'s day looked like.` : "Post yours to see it 👀",
          url: "/photos",
          tag: "photo",
        }).catch(console.error)
      );
    }
    revalidatePath("/photos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
