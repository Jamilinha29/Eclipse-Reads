/**
 * Bases HTTP dos microserviços.
 * - Dev: proxy Vite em /api/books e /api/library (ou VITE_* apontando para localhost).
 * - Produção (Vercel): VITE_* opcionais; fallback same-origin /api/* (ver vercel.json).
 */
export const PRODUCTION_API_MISCONFIGURED = false;

export const PRODUCTION_API_CONFIG_MESSAGE =
  "Defina VITE_BOOKS_API_URL e VITE_LIBRARY_API_URL (ou VITE_API_URL) se os backends estiverem em outro domínio.";

function resolveBooksBase(): string {
  const direct = import.meta.env.VITE_BOOKS_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  return "/api/books";
}

function resolveLibraryBase(): string {
  const direct = import.meta.env.VITE_LIBRARY_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  return "/api/library";
}

export const BOOKS_API_BASE_URL = resolveBooksBase();
export const LIBRARY_API_BASE_URL = resolveLibraryBase();
