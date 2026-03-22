import { supabase } from "@/integrations/supabase/client";

/**
 * Livros (SubmitBook / MySubmissions): `supabase.storage.from("books").upload(..., { cacheControl: "3600", upsert })`
 * e remoção com `.from("books").remove([filePath])`.
 *
 * Avatar/banner: mesmo fluxo no cliente, bucket separado `avatars` (só imagens de perfil).
 */
export const PROFILE_MEDIA_BUCKET = "avatars";

/** Mesmo cacheControl usado em SubmitBook para os PDFs/epub. */
export const PROFILE_IMAGE_UPLOAD_OPTIONS = {
  cacheControl: "3600" as const,
  upsert: true,
};

const PUBLIC_MARKER = "/object/public/";

export function storageObjectPathFromPublicUrl(
  url: string | null | undefined,
  bucket: string
): string | null {
  if (!url?.trim()) return null;
  const withoutQuery = url.split("?")[0];
  const marker = `${PUBLIC_MARKER}${bucket}/`;
  const idx = withoutQuery.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(withoutQuery.slice(idx + marker.length));
  } catch {
    return withoutQuery.slice(idx + marker.length);
  }
}

/** Remove objeto antigo se a URL apontava para outro path (troca de nome legado → path fixo). */
export async function removePreviousProfileObject(
  previousPublicUrl: string | null | undefined,
  nextObjectPath: string
) {
  const oldPath = storageObjectPathFromPublicUrl(previousPublicUrl, PROFILE_MEDIA_BUCKET);
  if (!oldPath || oldPath === nextObjectPath) return;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([oldPath]);
  if (error) console.warn("Remoção de mídia antiga do perfil:", error);
}
