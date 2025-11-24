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

// Função handler compatível com Deno e Node.js
const bookHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const bookId = url.searchParams.get('id');
    
    if (bookId) {
      // Buscar livro específico
      const { data, error } = await supabaseClient
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Livro não encontrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ book: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Buscar todos os livros
      const { data, error } = await supabaseClient
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ books: data ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
};

// Suporte para Deno
// @ts-ignore
if (typeof Deno !== 'undefined') {
  // @ts-ignore
  Deno.serve(bookHandler);
}

// Exportar para Node.js
export default bookHandler;
