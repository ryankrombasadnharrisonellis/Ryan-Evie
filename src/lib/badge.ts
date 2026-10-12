import { createAdminClient } from "@/lib/supabase/admin";

/** What needs this person's attention: unread notes + games where it's their move. */
export async function badgeCount(userId: string) {
  const admin = createAdminClient();
  const [notes, games] = await Promise.all([
    admin
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null)
      .not("delivered_at", "is", null),
    admin.from("games").select("id", { count: "exact", head: true }).eq("status", "active").eq("turn", userId),
  ]);
  return (notes.count ?? 0) + (games.count ?? 0);
}
