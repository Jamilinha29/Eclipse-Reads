// Este arquivo é gerado automaticamente. Não edite diretamente.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const AUTH_REMEMBER_ME_KEY = "eclipse_reads_remember_me";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias. " +
      "Crie um arquivo frontend/.env (não versione) e reinicie o dev server."
  );
}

// Importe o cliente supabase assim:
// import { supabase } from "@/integrations/supabase/client";

const getActiveStorage = () => {
  try {
    return localStorage.getItem(AUTH_REMEMBER_ME_KEY) === "true" ? localStorage : sessionStorage;
  } catch {
    return localStorage;
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: {
      getItem: (key) => getActiveStorage().getItem(key),
      setItem: (key, value) => getActiveStorage().setItem(key, value),
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    },
    persistSession: true,
    autoRefreshToken: true,
  }
});