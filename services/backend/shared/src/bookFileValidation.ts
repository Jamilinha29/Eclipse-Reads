export const BOOK_FILE_EXTENSIONS = ["pdf", "epub", "mobi"] as const;
export type BookFileExtension = (typeof BOOK_FILE_EXTENSIONS)[number];

function bytesToAscii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** Validação pura por magic bytes — única fonte de verdade (frontend + books-api). */
export function validateBookFileBytes(bytes: Uint8Array, ext: string): boolean {
  if (!bytes.length) return false;

  const normalized = ext.toLowerCase();
  if (normalized === "pdf") {
    return bytesToAscii(bytes, 0, 5) === "%PDF-";
  }
  if (normalized === "epub") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  if (normalized === "mobi") {
    const bookHead = bytesToAscii(bytes, 0, 4);
    const mobiHead = bytesToAscii(bytes, 60, 64);
    return bookHead === "BOOK" || mobiHead.includes("MOBI");
  }
  return false;
}

export function isBookFileExtension(ext: string): boolean {
  return (BOOK_FILE_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}
