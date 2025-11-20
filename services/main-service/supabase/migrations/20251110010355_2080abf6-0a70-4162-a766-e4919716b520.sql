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

-- Storage policies for books bucket to allow authenticated users to read
CREATE POLICY "Authenticated users can download books"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'books');

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