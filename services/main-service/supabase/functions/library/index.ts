/// <reference path="../types-esm.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

// @ts-ignore - Suporte para Deno
declare const Deno: any;

// Suporte para ambientes Deno e Node.js
const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof Deno !== 'undefined' && Deno.env) {
    // @ts-ignore
    return Deno.env.get(key) ?? '';
  }
  return process.env[key] ?? '';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const libraryHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Header Authorization não fornecido');
    }

    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); 

    let tableName = 'favorites';
    if (type === 'favoritos') tableName = 'favorites';
    else if (type === 'lendo') tableName = 'reading';
    else if (type === 'lidos') tableName = 'read';

    const { data: bookIds, error: idsError } = await supabaseClient
      .from(tableName)
      .select('book_id')
      .eq('user_id', user.id);

    if (idsError) throw idsError;

    const ids = (bookIds || []).map((item: any) => item.book_id);

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ books: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: books, error: booksError } = await supabaseClient
      .from('books')
      .select('*')
      .in('id', ids);

    if (booksError) throw booksError;

    return new Response(
      JSON.stringify({ books: books || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na biblioteca:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
};

// Suporte para Deno
if (typeof Deno !== 'undefined') {
  // @ts-ignore
  Deno.serve(libraryHandler);
}

// Exportar para Node.js
export default libraryHandler;
