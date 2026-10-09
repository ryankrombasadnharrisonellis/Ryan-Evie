import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { to } = (await req.json().catch(() => ({}))) as { to?: "me" | "partner" };
  const target = to === "partner" ? partner : me;
  if (!target) return NextResponse.json({ error: "No partner account yet" }, { status: 400 });

  const delivered = await sendPushToUser(target.id, {
    title: to === "partner" ? `Test from ${me.display_name} 💌` : "It works! 🎉",
    body:
      to === "partner"
        ? `${me.display_name} is testing notifications.`
        : "Push notifications are set up on this phone.",
    url: "/",
  });
  return NextResponse.json({ delivered });
}
