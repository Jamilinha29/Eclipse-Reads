-- Criar tabela de citações/frases do dia
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL,
  author text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública de citações
CREATE POLICY "Quotes are viewable by everyone"
ON public.quotes
FOR SELECT
USING (is_active = true);

-- Criar tabela de marcadores de leitura
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  current_page integer DEFAULT 1,
  total_pages integer,
  progress_percentage decimal(5,2),
  last_read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Habilitar RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para reading_progress
CREATE POLICY "Users can view their own progress"
ON public.reading_progress
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own progress"
ON public.reading_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own progress"
ON public.reading_progress
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own progress"
ON public.reading_progress
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at
BEFORE UPDATE ON public.reading_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas citações de exemplo
INSERT INTO public.quotes (quote, author, category) VALUES
('Não são as palavras que dizemos ou os pensamentos que pensamos, mas sim aquilo que fazemos que nos define.', 'J.R.R. Tolkien', 'Fantasia'),
('Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.', 'George R.R. Martin', 'Fantasia'),
('A leitura é para a mente o que o exercício é para o corpo.', 'Joseph Addison', 'Geral'),
('Os livros são uma porta de entrada para mil mundos.', 'Desconhecido', 'Geral'),
('Quanto mais você lê, mais coisas você saberá. Quanto mais você aprende, mais lugares você irá.', 'Dr. Seuss', 'Infantil'),
('Um livro é um sonho que você segura nas mãos.', 'Neil Gaiman', 'Fantasia'),
('Há muitos pequenos modos de ampliar nosso mundo. O amor pelos livros é o melhor de todos.', 'Jacqueline Kennedy', 'Geral'),
('A leitura traz ao homem plenitude, o discurso segurança e a escrita precisão.', 'Francis Bacon', 'Filosofia');