"use client";
import { useRef, useState, useTransition } from "react";
import { postPhoto } from "@/app/photos/actions";
import { resizeImage, uploadMedia } from "@/lib/upload";

export default function PhotoUploader({ partnerName, partnerPosted }: { partnerName: string; partnerPosted: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    try {
      const small = await resizeImage(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("Couldn't read that photo — try another.");
    }
  }

  function send() {
    if (!file) return;
    start(async () => {
      try {
        const path = await uploadMedia(file, "photos", "jpg");
        const r = await postPhoto(path, caption);
        if (!r.ok) setError(r.error);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <section className="card space-y-3">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {!preview ? (
        <button
          onClick={() => input.current?.click()}
          className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line bg-line/20 text-muted active:scale-[0.99]"
        >
          <span className="text-5xl">📷</span>
          <span className="font-display text-lg font-semibold text-ink">Add today&apos;s photo</span>
          <span className="px-6 text-center text-sm">
            {partnerPosted ? `🔒 ${partnerName} has posted — add yours to unlock it` : "Whatever your day looks like right now"}
          </span>
        </button>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your photo" className="w-full rounded-3xl object-cover" />
          <input className="input" placeholder="Add a caption (optional)" maxLength={140} value={caption} onChange={(e) => setCaption(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={pending} onClick={() => input.current?.click()}>Change</button>
            <button className="btn-primary" disabled={pending} onClick={send}>{pending ? "Posting…" : "Post 📸"}</button>
          </div>
        </>
      )}
      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </section>
  );
}
