import { createAdminClient } from "@/lib/supabase/admin";

export const MEDIA_BUCKET = "media";

/** Short-lived links for private photos / voice notes / doodles. */
export async function signedUrls(paths: (string | null | undefined)[], expiresIn = 60 * 60 * 6): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (!unique.length) return {};
  const { data } = await createAdminClient().storage.from(MEDIA_BUCKET).createSignedUrls(unique, expiresIn);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/** Only accept uploads that sit in the uploader's own folder. */
export function ownsPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.length < 200;
}
