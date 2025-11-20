import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // favoritos, lendo, lidos

    // Mapear tipo para nome da tabela
    let tableName = 'favorites';
    if (type === 'favoritos') tableName = 'favorites';
    else if (type === 'lendo') tableName = 'reading';
    else if (type === 'lidos') tableName = 'read';


    if (idsError) throw idsError;

    const ids = bookIds.map(item => item.book_id);

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ books: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados completos dos livros
    const { data: books, error: booksError } = await supabaseClient
      .from('books')
      .select('*')
      .in('id', ids);

    if (booksError) throw booksError;

    return new Response(
      JSON.stringify({ books }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
