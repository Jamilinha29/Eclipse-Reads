-- Eclipse Reads — schema completo do banco (referência / projeto NOVO)
-- Projeto Supabase: wnaymuusxwvawmbieukm
-- Storage bucket `books`: pasta `livros/` (PDF/EPUB/MOBI), pasta `covers/` (capas)
--
-- USO:
--   • Projeto Supabase VAZIO: colar no SQL Editor uma vez.
--   • Projeto JÁ migrado: NÃO rode de novo — use npm run db:push (migrações incrementais).
--
-- Migrações automáticas (CLI): services/main-service/supabase/migrations/
-- https://supabase.com/dashboard/project/wnaymuusxwvawmbieukm/sql/new

-- ========== 20251031212951_79e38e8a-4654-4649-836d-fbbb580fdec9.sql ==========
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  username TEXT NOT NULL DEFAULT 'Usuário',
  avatar_image TEXT,
  banner_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  book_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create reading table
CREATE TABLE public.reading (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  book_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reading ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading list"
ON public.reading FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading list"
ON public.reading FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading list"
ON public.reading FOR DELETE
USING (auth.uid() = user_id);

-- Create read table
CREATE TABLE public.read (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  book_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.read ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read list"
ON public.read FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read list"
ON public.read FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read list"
ON public.read FOR DELETE
USING (auth.uid() = user_id);

-- Create reading_goals table
CREATE TABLE public.reading_goals (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  target_books INTEGER NOT NULL,
  current_books INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
ON public.reading_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.reading_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.reading_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.reading_goals FOR DELETE
USING (auth.uid() = user_id);

-- Create settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  theme TEXT NOT NULL DEFAULT 'dark',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reading_goals_updated_at
BEFORE UPDATE ON public.reading_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 20251103122609_5c2d4c1a-0fbc-4e8b-ab46-c5643c05bb97.sql ==========
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
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.reading_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.reading_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
ON public.reading_progress
FOR DELETE
USING (auth.uid() = user_id);

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

-- ========== 20251105123617_fb1ae9a4-0c8b-4d77-b7fc-b99bb3b378f6.sql ==========
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create storage bucket for books
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'books',
  'books',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook']
);

-- Create table to track book uploads from users
CREATE TABLE public.book_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.book_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions or admins can view all
CREATE POLICY "Users can view their own submissions"
ON public.book_submissions
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can insert their own submissions
CREATE POLICY "Users can insert their own submissions"
ON public.book_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending submissions
CREATE POLICY "Users can update their own pending submissions"
ON public.book_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can update any submission
CREATE POLICY "Admins can update submissions"
ON public.book_submissions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON public.book_submissions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_book_submissions_updated_at
BEFORE UPDATE ON public.book_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for books bucket
-- Users can upload their own files
CREATE POLICY "Users can upload their own books"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'books' AND
  (
    (
      (storage.foldername(name))[1] = 'livros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Users can view their own files or admins can view all
CREATE POLICY "Users can view their own books"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'books' AND
  (
    (
      (storage.foldername(name))[1] = 'livros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own books"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'books' AND
  (
    (
      (storage.foldername(name))[1] = 'livros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Admins can manage all files
CREATE POLICY "Admins can manage all books"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'books' AND
  public.has_role(auth.uid(), 'admin')
);

-- ========== 20251110010355_2080abf6-0a70-4162-a766-e4919716b520.sql ==========
-- Create books table for approved books
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  cover_image TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submission_id UUID REFERENCES public.book_submissions(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view approved books
CREATE POLICY "Anyone can view books"
ON public.books
FOR SELECT
TO authenticated, anon
USING (true);

-- C-02: clientes Supabase não recebem file_path (service_role / books-api mantêm acesso total)
REVOKE ALL ON TABLE public.books FROM anon;
REVOKE ALL ON TABLE public.books FROM authenticated;
GRANT SELECT (
  id, title, author, description, category, cover_image, rating, file_type,
  created_at, updated_at, submission_id, age_rating
) ON TABLE public.books TO anon, authenticated;

-- Policy: Only admins can insert books
CREATE POLICY "Admins can insert books"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Only admins can update books
CREATE POLICY "Admins can update books"
ON public.books
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Only admins can delete books
CREATE POLICY "Admins can delete books"
ON public.books
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create index for better performance
CREATE INDEX idx_books_category ON public.books(category);
CREATE INDEX idx_books_created_at ON public.books(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_books_updated_at();

-- Storage: leitura direta limitada a capas (livros/ só via books-api + token)
CREATE POLICY "Read cover images in books bucket"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'books' AND
  (storage.foldername(name))[1] = 'covers'
);

-- Allow admins to upload to books bucket
CREATE POLICY "Admins can upload books"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow users to upload their submissions
CREATE POLICY "Users can upload their submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'books');

-- ========== 20251112115503_d61409d0-f6ed-421d-b6b3-5a5256f09571.sql ==========
-- Allow image uploads in books bucket (for covers subfolder)
-- The books bucket already exists and is public

-- Create policy to allow authenticated users (admins) to upload images
CREATE POLICY "Admins can upload cover images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy to allow admins to update cover images
CREATE POLICY "Admins can update cover images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy to allow admins to delete cover images
CREATE POLICY "Admins can delete cover images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow everyone to view cover images (they're in public bucket)
CREATE POLICY "Anyone can view cover images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
);

-- ========== 20251113115032_3e2b58c7-566d-4a78-9e36-b14665385a57.sql ==========
-- Adicionar faixa etária aos livros
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS age_rating text DEFAULT 'Livre';

-- Adicionar comentário
COMMENT ON COLUMN public.books.age_rating IS 'Faixa etária recomendada: Livre, 10+, 12+, 14+, 16+, 18+';

-- ========== 20251113115606_85c2a46b-1551-4e0e-97cd-284d7485e53c.sql ==========
-- Atualizar bucket para aceitar imagens de capa
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/epub+zip',
  'application/epub',
  'application/x-epub+zip',
  'application/x-mobipocket-ebook',
  'application/x-mobi',
  'application/vnd.amazon.ebook',
  'application/octet-stream',
  'application/zip',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]
WHERE id = 'books';

-- ========== 20251114130856_71ea9a0b-69a2-41ff-9cc4-db5d0f081aa6.sql ==========
-- Criar tabela de reviews/avaliações
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Habilitar RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para reviews
CREATE POLICY "Reviews são públicas"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Usuários podem criar suas próprias avaliações"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias avaliações"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias avaliações"
ON public.reviews FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_reviews_updated_at();

-- Adicionar coluna age_rating se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'age_rating'
  ) THEN
    ALTER TABLE public.books ADD COLUMN age_rating TEXT DEFAULT 'Livre';
  END IF;
END $$;

-- ========== 20251114130926_3ce70584-42ff-423e-9364-671fd4d2d1ae.sql ==========
-- Corrigir search_path da função update_reviews_updated_at
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

-- Corrigir search_path da função update_books_updated_at que estava sem
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

-- ========== 20260322120000_storage_avatars_rls.sql ==========
-- Bucket avatars (avatar/banner): mesmo padrão dos livros — primeiro segmento do path = user_id.
-- Corrige: StorageApiError "new row violates row-level security policy" no upload.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_admins_all" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_users_insert_own_folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_users_update_own_folder"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_users_delete_own_folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_admins_all"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
);

-- ========== 20260522120000_audit_fixes.sql ==========
-- Audit fixes: achievements, settings column, unique constraints, storage policy

-- Achievements tables
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
ON public.achievements FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Users can view their own user_achievements"
ON public.user_achievements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Conquistas: INSERT/DELETE apenas via service_role (backend); usuário só lê as próprias

-- Settings: new books notifications
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS new_books_notifications BOOLEAN NOT NULL DEFAULT true;

-- Prevent duplicate library entries
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_book_unique
ON public.favorites (user_id, book_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reading_user_book_unique
ON public.reading (user_id, book_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS read_user_book_unique
ON public.read (user_id, book_id)
WHERE user_id IS NOT NULL;

-- Prevent duplicate books from same submission
CREATE UNIQUE INDEX IF NOT EXISTS books_submission_id_unique
ON public.books (submission_id)
WHERE submission_id IS NOT NULL;

-- Tighten storage: users may only upload under their own folder
DROP POLICY IF EXISTS "Users can upload their submissions" ON storage.objects;

CREATE POLICY "Users can upload their submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' AND
  (
    (
      (storage.foldername(name))[1] = 'livros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ========== 20260522130000_storage_mensagem_diaria.sql ==========
-- Bucket usado pelo books-api para mensagens do dia (GET /quotes/today)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mensagem-diaria',
  'mensagem-diaria',
  true,
  1048576,
  ARRAY['text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read daily messages"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'mensagem-diaria');

CREATE POLICY "Admins can manage daily messages"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'mensagem-diaria' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'mensagem-diaria' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ========== 20260523120000_storage_select_covers_only.sql ==========
-- (Política de capas já aplicada acima; bloco mantido para histórico de migrações.)
