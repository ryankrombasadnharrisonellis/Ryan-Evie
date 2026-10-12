import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { badgeCount } from "@/lib/badge";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await badgeCount(session.user.id) });
}
