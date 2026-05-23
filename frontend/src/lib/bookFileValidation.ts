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
