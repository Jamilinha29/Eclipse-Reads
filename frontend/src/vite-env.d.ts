/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase (obrigatória em produção). */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave anônima / publishable do Supabase (obrigatória em produção). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Base URL do books-api (livros, quotes, reviews). Fallback: VITE_API_URL → localhost:4000. */
  readonly VITE_BOOKS_API_URL?: string;
  /** Base URL do library-service (perfil, biblioteca, admin /me). Fallback: VITE_API_URL → localhost:4200. */
  readonly VITE_LIBRARY_API_URL?: string;
  /** Uma única origem para ambos os serviços, se usarem o mesmo host. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
