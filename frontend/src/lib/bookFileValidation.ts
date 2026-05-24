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
  if (!["pdf", "epub", "mobi"].includes(ext)) return false;

  const buffer = await file.slice(0, 68).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (ext === "pdf") {
    const head = String.fromCharCode(...bytes.slice(0, 5));
    return head === "%PDF-";
  }

  if (ext === "epub") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }

  if (ext === "mobi") {
    const bookHead = String.fromCharCode(...bytes.slice(0, 4));
    const mobiHead = String.fromCharCode(...bytes.slice(60, 64));
    return bookHead === "BOOK" || mobiHead.includes("MOBI");
  }

  return false;
}
