-- Atualizar bucket para aceitar imagens de capa
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]
WHERE id = 'books';