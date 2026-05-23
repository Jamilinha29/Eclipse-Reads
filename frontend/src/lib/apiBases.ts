/**
 * Bases HTTP dos microserviços. Em produção, defina VITE_* na Vercel; caminhos
 * relativos /api/books e /api/library não existem no deploy estático (viram HTML).
 */
export const PRODUCTION_API_MISCONFIGURED =
  !import.meta.env.DEV &&
  !import.meta.env.VITE_BOOKS_API_URL &&
  !import.meta.env.VITE_LIBRARY_API_URL &&
  !import.meta.env.VITE_API_URL;

export const PRODUCTION_API_CONFIG_MESSAGE =
  "Defina VITE_BOOKS_API_URL e VITE_LIBRARY_API_URL (ou VITE_API_URL) nas variáveis de ambiente da Vercel e faça redeploy.";

function resolveBooksBase(): string {
  const direct = import.meta.env.VITE_BOOKS_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  if (import.meta.env.DEV) return "/api/books";
  if (PRODUCTION_API_MISCONFIGURED) {
    console.warn(`[Eclipse Reads] ${PRODUCTION_API_CONFIG_MESSAGE}`);
  }
  return "";
}

function resolveLibraryBase(): string {
  const direct = import.meta.env.VITE_LIBRARY_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  if (import.meta.env.DEV) return "/api/library";
  return "";
}

export const BOOKS_API_BASE_URL = resolveBooksBase();
export const LIBRARY_API_BASE_URL = resolveLibraryBase();
