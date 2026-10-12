"use client";
import { createClient } from "@/lib/supabase/client";

/** Shrink a photo on the phone before uploading (faster, and plenty sharp on a phone screen). */
export async function resizeImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process photo"))), "image/jpeg", quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Upload into our private storage, inside the uploader's own folder. Returns the storage path. */
export async function uploadMedia(blob: Blob, folder: "photos" | "voice" | "doodles", ext: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please log in again.");
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const path = `${session.user.id}/${folder}/${id}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, {
    contentType: blob.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
