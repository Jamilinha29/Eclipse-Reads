/**
 * Bases HTTP dos microserviços. Em produção, defina VITE_* na Vercel; caminhos
 * relativos /api/books e /api/library não existem no deploy estático (viram HTML).
 */
function resolveBooksBase(): string {
  const direct = import.meta.env.VITE_BOOKS_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  if (import.meta.env.DEV) return "/api/books";
  throw new Error(
    "Produção: defina VITE_BOOKS_API_URL ou VITE_API_URL no painel da Vercel (Environment Variables) e faça Redeploy."
  );
}

function resolveLibraryBase(): string {
  const direct = import.meta.env.VITE_LIBRARY_API_URL;
  const common = import.meta.env.VITE_API_URL;
  if (direct) return direct;
  if (common) return common;
  if (import.meta.env.DEV) return "/api/library";
  throw new Error(
    "Produção: defina VITE_LIBRARY_API_URL ou VITE_API_URL no painel da Vercel (Environment Variables) e faça Redeploy."
  );
}

export const BOOKS_API_BASE_URL = resolveBooksBase();
export const LIBRARY_API_BASE_URL = resolveLibraryBase();
