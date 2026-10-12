import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import { formatWhen, timeAgo, tzCity } from "@/lib/time";
import { markNotesRead } from "@/app/actions";
import NoteComposer from "./NoteComposer";
import CancelNoteButton from "./CancelNoteButton";
import NoteBubble from "./NoteBubble";
import { signedUrls } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";

  const { data } = await supabase
    .from("notes")
    .select("id, sender_id, recipient_id, body, kind, media_path, reactions, deliver_at, delivered_at, read_at, created_at")
    .order("deliver_at", { ascending: false })
    .limit(100);
  const notes = data ?? [];
  const unreadIds = notes.filter((n) => n.recipient_id === me.id && !n.read_at).map((n) => n.id);
  if (unreadIds.length) await markNotesRead();

  const urls = await signedUrls(notes.map((n) => n.media_path));
  const scheduled = notes.filter((n) => n.sender_id === me.id && !n.delivered_at).reverse();
  const timeline = notes.filter((n) => n.delivered_at);

  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">Notes 💌</h1>
        <p className="text-sm text-muted">Little messages, now or for later.</p>
      </header>

      {partner && <NoteComposer partnerName={partnerName} partnerTimezone={partner.timezone} partnerCity={partner.city || tzCity(partner.timezone)} />}

      {scheduled.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">⏰ Scheduled for {partnerName}</h2>
          {scheduled.map((n) => (
            <div key={n.id} className="card flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
                {n.kind === "doodle" && n.media_path && urls[n.media_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[n.media_path]} alt="Doodle" className="mt-2 w-32 rounded-xl bg-white" />
                )}
                <p className="mt-1 text-xs text-muted">
                  Arrives {formatWhen(new Date(n.deliver_at), partner?.timezone ?? me.timezone)} their time
                </p>
              </div>
              <CancelNoteButton id={n.id} />
            </div>
          ))}
        </section>
      )}

      <section className="space-y-4">
        {timeline.length === 0 && <p className="card text-center text-muted">No notes yet. Write the first one 💗</p>}
        {timeline.map((n) => {
          const mine = n.sender_id === me.id;
          const reactions = (n.reactions ?? {}) as Record<string, string>;
          return (
            <NoteBubble
              key={n.id}
              id={n.id}
              mine={mine}
              body={n.body}
              kind={n.kind ?? "text"}
              mediaUrl={n.media_path ? urls[n.media_path] ?? null : null}
              when={timeAgo(new Date(n.delivered_at))}
              status={mine ? (n.read_at ? "Seen" : "Delivered") : null}
              unread={!mine && unreadIds.includes(n.id)}
              myReaction={reactions[me.id] ?? null}
              theirReaction={partner ? reactions[partner.id] ?? null : null}
            />
          );
        })}
      </section>
    </div>
  );
}
