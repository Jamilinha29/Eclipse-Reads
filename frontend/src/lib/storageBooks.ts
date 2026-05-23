import { supabase } from "@/integrations/supabase/client";

const BOOKS_FILES_DIR = "livros";
const BOOK_FILE_EXTENSIONS = new Set(["pdf", "epub", "mobi"]);

export type StorageBookFile = {
  name: string;
  id: string;
  metadata: Record<string, unknown> | null;
};

function isBookFileName(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return BOOK_FILE_EXTENSIONS.has(base.slice(dot + 1).toLowerCase());
}

function isStorageFolder(entry: { id?: string | null; metadata?: unknown }): boolean {
  return entry.id == null && entry.metadata == null;
}

async function listLivrosRecursive(prefix: string): Promise<StorageBookFile[]> {
  const { data, error } = await supabase.storage.from("books").list(prefix, {
    limit: 2000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(error.message);
  }

  const files: StorageBookFile[] = [];

  for (const item of data ?? []) {
    if (!item.name) continue;
    const path = `${prefix}/${item.name}`;

    if (isStorageFolder(item)) {
      files.push(...(await listLivrosRecursive(path)));
      continue;
    }

    if (isBookFileName(item.name)) {
      files.push({
        name: path,
        id: item.id ?? path,
        metadata: (item.metadata as Record<string, unknown> | undefined) ?? null,
      });
    }
  }

  return files;
}

/** Nome do ficheiro sem pastas (ex.: `livros/foo.epub` → `foo.epub`). */
export function storageFileBasename(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath;
}

/** Lista PDF/EPUB/MOBI em `books/livros/` (inclui subpastas, ex. submissões por usuário). */
export async function listLivrosBookFilesFromStorage(): Promise<StorageBookFile[]> {
  return listLivrosRecursive(BOOKS_FILES_DIR);
}
