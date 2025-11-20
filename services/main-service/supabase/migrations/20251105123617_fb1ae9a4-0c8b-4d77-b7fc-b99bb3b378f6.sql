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
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files or admins can view all
CREATE POLICY "Users can view their own books"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'books' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR
   public.has_role(auth.uid(), 'admin'))
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own books"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'books' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all files
CREATE POLICY "Admins can manage all books"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'books' AND
  public.has_role(auth.uid(), 'admin')
);