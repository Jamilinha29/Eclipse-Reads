// Este arquivo é gerado automaticamente. Não edite diretamente.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vwipzzvyziqwtfwivhns.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3aXB6enZ5emlxd3Rmd2l2aG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTc1MDEsImV4cCI6MjA3NzE3MzUwMX0.g8aeCqgF3_UjKrL6EEMdU_AfS3i8UZF6Cve1vicGnkU";

// Importe o cliente supabase assim:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});