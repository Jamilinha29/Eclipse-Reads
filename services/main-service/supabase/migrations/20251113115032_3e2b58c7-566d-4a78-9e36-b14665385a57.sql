-- Adicionar faixa etária aos livros
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS age_rating text DEFAULT 'Livre';

-- Adicionar comentário
COMMENT ON COLUMN public.books.age_rating IS 'Faixa etária recomendada: Livre, 10+, 12+, 14+, 16+, 18+';