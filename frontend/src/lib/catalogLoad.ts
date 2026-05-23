import { BOOKS_API_BASE_URL } from "@/lib/apiBases";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

export type CatalogBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_image: string | null;
  rating: number;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function dedupeCatalogBooks(books: CatalogBook[]): CatalogBook[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    const key = `${b.title.toLowerCase()}-${b.author.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isRetryableCatalogError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof Error && /failed to fetch|network|load failed/i.test(err.message)) return true;
  return false;
}

export function getCatalogUserMessage(err: unknown, retrying: boolean): string {
  if (retrying) return "Reconectando ao catálogo…";
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sem conexão com a internet. Assim que a rede voltar, tentaremos de novo.";
  }
  if (isRetryableCatalogError(err)) {
    return "Não conseguimos carregar os livros agora. Verifique sua conexão ou tente novamente.";
  }
  return "O catálogo está temporariamente indisponível. Tente novamente em alguns instantes.";
}

export function logCatalogError(err: unknown): void {
  if (!import.meta.env.DEV) return;
  console.error("[Eclipse Reads] Falha ao carregar catálogo:", err);
  console.info("[Eclipse Reads] books-api URL:", BOOKS_API_BASE_URL || "(não configurada)");
  console.info(
    "[Eclipse Reads] Dica: abra DevTools → Network e veja o pedido GET /books (status, CORS, URL)."
  );
}

export async function fetchCatalogWithRetry(
  fetchBooks: () => Promise<{ books?: CatalogBook[] }>,
  onRetry?: (attempt: number) => void,
): Promise<CatalogBook[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) onRetry?.(attempt);

    try {
      const response = await fetchBooks();
      return dedupeCatalogBooks(response?.books ?? []);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableCatalogError(err)) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      break;
    }
  }

  logCatalogError(lastError);
  throw lastError;
}
