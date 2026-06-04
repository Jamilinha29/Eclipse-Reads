/// <reference path="../types-esm.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

// @ts-ignore - Suporte para Deno
declare const Deno: any;

const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof Deno !== 'undefined' && Deno.env) {
    // @ts-ignore
    return Deno.env.get(key) ?? '';
  }
  return process.env[key] ?? '';
};

const ALLOWED_ORIGIN = getEnv('ALLOWED_ORIGIN') || 'https://eclipse-reads.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Campos públicos — nunca expor file_path (C-05). */
const PUBLIC_BOOK_FIELDS =
  'id, title, author, description, category, cover_image, rating, file_type, created_at, age_rating';

const bookHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const url = new URL(req.url);
    const bookId = url.searchParams.get('id');

    if (bookId) {
      const { data, error } = await supabaseClient
        .from('books')
        .select(PUBLIC_BOOK_FIELDS)
        .eq('id', bookId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(JSON.stringify({ error: 'Livro não encontrado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      return new Response(JSON.stringify({ book: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabaseClient
      .from('books')
      .select(PUBLIC_BOOK_FIELDS)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ books: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
};

// @ts-ignore
if (typeof Deno !== 'undefined') {
  // @ts-ignore
  Deno.serve(bookHandler);
}

export default bookHandler;
