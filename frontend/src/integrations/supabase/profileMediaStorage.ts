/**
 * Modo convidado: imagens em localStorage (data URL).
 * Conta autenticada: upload de avatar/banner direto no bucket `avatars` (Supabase Storage).
 */
export const GUEST_AUTH_FLAG_KEY = "eclipse_reads_auth_type";
export const GUEST_SESSION_KEY = "eclipse_reads_guest_session";
export const GUEST_AVATAR_KEY = "eclipse_reads_guest_avatar";
export const GUEST_BANNER_KEY = "eclipse_reads_guest_banner";
/** Limite por ficheiro no modo convidado (localStorage). */
export const GUEST_PROFILE_IMAGE_MAX_BYTES = 1_500_000;

export function isGuestSessionActive(): boolean {
  try {
    return (
      localStorage.getItem(GUEST_AUTH_FLAG_KEY) === "guest" &&
      Boolean(sessionStorage.getItem(GUEST_SESSION_KEY))
    );
  } catch {
    return false;
  }
}

export function startGuestSession(): void {
  sessionStorage.setItem(GUEST_SESSION_KEY, crypto.randomUUID());
  localStorage.setItem(GUEST_AUTH_FLAG_KEY, "guest");
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_AUTH_FLAG_KEY);
  localStorage.removeItem(GUEST_AVATAR_KEY);
  localStorage.removeItem(GUEST_BANNER_KEY);
  sessionStorage.removeItem(GUEST_SESSION_KEY);
}

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
