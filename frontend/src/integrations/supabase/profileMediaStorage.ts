import { supabase } from "@/integrations/supabase/client";

/**
 * Livros (SubmitBook / MySubmissions): `supabase.storage.from("books").upload(..., { cacheControl: "3600", upsert })`
 * e remoção com `.from("books").remove([filePath])`.
 *
 * Utilizador com conta (incl. admin): bucket `avatars` + tabela `profiles`.
 * Convidado: sem JWT → não usa Storage; imagens em localStorage (data URL), como a biblioteca convidada.
 */
export const PROFILE_MEDIA_BUCKET = "avatars";

export const GUEST_AUTH_FLAG_KEY = "eclipse_reads_auth_type";
export const GUEST_AVATAR_KEY = "eclipse_reads_guest_avatar";
export const GUEST_BANNER_KEY = "eclipse_reads_guest_banner";
/** Limite por ficheiro no modo convidado (localStorage). */
export const GUEST_PROFILE_IMAGE_MAX_BYTES = 1_500_000;

export function readImageFileAsDataUrl(file: File, maxBytes = GUEST_PROFILE_IMAGE_MAX_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecione um ficheiro de imagem."));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`Imagem demasiado grande (máx. ${Math.round(maxBytes / 1024)} KB como convidado).`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

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
