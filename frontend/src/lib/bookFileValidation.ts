import { isBookFileExtension, validateBookFileBytes } from "@eclipse-reads/shared";

const WEB_READABLE_EXTENSIONS = new Set(["pdf", "epub"]);

export function normalizeBookFileType(fileType: string | null | undefined): string {
  const raw = (fileType ?? "").trim().toLowerCase();
  if (raw === "application/pdf" || raw === "pdf") return "pdf";
  if (raw === "application/epub+zip" || raw === "epub") return "epub";
  if (raw === "application/x-mobipocket-ebook" || raw === "mobi") return "mobi";
  return raw;
}

/** Formatos que o leitor web consegue exibir (sem download). */
export function isWebReadableBookFormat(fileType: string | null | undefined): boolean {
  return WEB_READABLE_EXTENSIONS.has(normalizeBookFileType(fileType));
}

/** Validação básica de conteúdo de arquivo de livro (magic bytes). */
export async function validateBookFileContent(file: File): Promise<boolean> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!isBookFileExtension(ext)) return false;

  const buffer = await file.slice(0, 68).arrayBuffer();
  return validateBookFileBytes(new Uint8Array(buffer), ext);
}
