-- Migration: security — C-01 RLS, C-02 file_path, C-03 storage covers-only, achievements
-- Prioridade: CRÍTICA | Aplicar: npm run db:push
-- Nota: timestamp 20260525230000 > baseline 20260525180000 (ordem exigida pelo Supabase CLI)

-- ========== C-01: remover escape RLS "user_id IS NULL" ==========

DELETE FROM public.profiles WHERE user_id IS NULL;
DELETE FROM public.favorites WHERE user_id IS NULL;
DELETE FROM public.reading WHERE user_id IS NULL;
DELETE FROM public.read WHERE user_id IS NULL;
DELETE FROM public.reading_goals WHERE user_id IS NULL;
DELETE FROM public.user_settings WHERE user_id IS NULL;
DELETE FROM public.reading_progress WHERE user_id IS NULL;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reading
DROP POLICY IF EXISTS "Users can view their own reading list" ON public.reading;
DROP POLICY IF EXISTS "Users can insert their own reading list" ON public.reading;
DROP POLICY IF EXISTS "Users can delete their own reading list" ON public.reading;
CREATE POLICY "Users can view their own reading list" ON public.reading FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reading list" ON public.reading FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reading list" ON public.reading FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- read
DROP POLICY IF EXISTS "Users can view their own read list" ON public.read;
DROP POLICY IF EXISTS "Users can insert their own read list" ON public.read;
DROP POLICY IF EXISTS "Users can delete their own read list" ON public.read;
CREATE POLICY "Users can view their own read list" ON public.read FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own read list" ON public.read FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own read list" ON public.read FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reading_goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.reading_goals;
CREATE POLICY "Users can view their own goals" ON public.reading_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.reading_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.reading_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.reading_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- reading_progress
DROP POLICY IF EXISTS "Users can view their own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.reading_progress;
CREATE POLICY "Users can view their own progress" ON public.reading_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.reading_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own progress" ON public.reading_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.favorites ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.reading ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.read ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.reading_goals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.reading_progress ALTER COLUMN user_id SET NOT NULL;

-- ========== C-02: ocultar file_path em SELECT direto (anon/authenticated) ==========

REVOKE ALL ON TABLE public.books FROM anon;
REVOKE ALL ON TABLE public.books FROM authenticated;

GRANT SELECT (
  id,
  title,
  author,
  description,
  category,
  cover_image,
  rating,
  file_type,
  created_at,
  updated_at,
  submission_id,
  age_rating
) ON TABLE public.books TO anon, authenticated;

-- ========== C-03: Storage — apenas capas (covers/) via cliente Supabase ==========

DROP POLICY IF EXISTS "Authenticated users can download books" ON storage.objects;

DROP POLICY IF EXISTS "Read cover images in books bucket" ON storage.objects;
CREATE POLICY "Read cover images in books bucket"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'books' AND
  (storage.foldername(name))[1] = 'covers'
);

-- ========== A-06: conquistas não auto-concedidas pelo cliente ==========

DROP POLICY IF EXISTS "Users can insert their own user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can delete their own user_achievements" ON public.user_achievements;
