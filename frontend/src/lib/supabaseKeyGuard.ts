/**
 * Garante que o frontend nunca use a service_role key (bypassa RLS).
 * A chave anon/publishable DEVE aparecer no header `apikey` nas requisições — isso é esperado.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function assertBrowserSafeSupabaseKey(key: string, envVarName: string): void {
  const payload = decodeJwtPayload(key);
  if (!payload) return;

  if (payload.role === "service_role") {
    throw new Error(
      `${envVarName} contém a chave service_role. ` +
        "Ela NUNCA deve ir para o frontend (Vite/Vercel). " +
        "Use apenas a chave anon/public em Project Settings → API."
    );
  }
}
