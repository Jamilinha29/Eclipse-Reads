/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase (obrigatória em produção). */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave anônima / publishable do Supabase (obrigatória em produção). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Base do books-api. Opcional: VITE_API_URL. Só em dev, fallback /api/books. */
  readonly VITE_BOOKS_API_URL?: string;
  /** Base do library-service. Opcional: VITE_API_URL. Só em dev, fallback /api/library. */
  readonly VITE_LIBRARY_API_URL?: string;
  /** Uma única origem para ambos, se faltar as duas acima. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
