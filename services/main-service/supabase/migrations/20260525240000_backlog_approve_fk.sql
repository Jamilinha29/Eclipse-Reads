-- D-04: aprovação transacional | D-05: FK book_id → books.id

CREATE OR REPLACE FUNCTION public.approve_book_submission(
  p_submission_id UUID,
  p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.book_submissions%ROWTYPE;
  v_book_id UUID;
BEGIN
  SELECT * INTO v_sub
  FROM public.book_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_not_found';
  END IF;

  IF v_sub.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'submission_not_pending';
  END IF;

  IF EXISTS (SELECT 1 FROM public.books WHERE submission_id = p_submission_id) THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  INSERT INTO public.books (
    title, author, description, category, file_path, file_type, submission_id
  )
  VALUES (
    v_sub.title,
    v_sub.author,
    v_sub.description,
    v_sub.category,
    v_sub.file_path,
    v_sub.file_type,
    p_submission_id
  )
  RETURNING id INTO v_book_id;

  UPDATE public.book_submissions
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = p_reviewer_id
  WHERE id = p_submission_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'book_id', v_book_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_book_submission(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_book_submission(UUID, UUID) TO service_role;

-- D-05: book_id UUID + FK (remove IDs inválidos antes)
DELETE FROM public.favorites WHERE book_id IS NULL OR book_id !~* '^[0-9a-f-]{36}$';
DELETE FROM public.reading WHERE book_id IS NULL OR book_id !~* '^[0-9a-f-]{36}$';
DELETE FROM public.read WHERE book_id IS NULL OR book_id !~* '^[0-9a-f-]{36}$';

DELETE FROM public.favorites f
WHERE NOT EXISTS (SELECT 1 FROM public.books b WHERE b.id::text = f.book_id);

DELETE FROM public.reading r
WHERE NOT EXISTS (SELECT 1 FROM public.books b WHERE b.id::text = r.book_id);

DELETE FROM public.read r
WHERE NOT EXISTS (SELECT 1 FROM public.books b WHERE b.id::text = r.book_id);

ALTER TABLE public.favorites
  ALTER COLUMN book_id TYPE UUID USING book_id::uuid;

ALTER TABLE public.reading
  ALTER COLUMN book_id TYPE UUID USING book_id::uuid;

ALTER TABLE public.read
  ALTER COLUMN book_id TYPE UUID USING book_id::uuid;

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_book_id_fkey;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.reading
  DROP CONSTRAINT IF EXISTS reading_book_id_fkey;

ALTER TABLE public.reading
  ADD CONSTRAINT reading_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.read
  DROP CONSTRAINT IF EXISTS read_book_id_fkey;

ALTER TABLE public.read
  ADD CONSTRAINT read_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
