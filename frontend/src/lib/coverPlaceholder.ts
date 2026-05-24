/** Placeholder neutro quando o livro não tem capa ou a URL falha ao carregar. */
export const BOOK_COVER_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
      <rect fill="#3f3f46" width="400" height="600"/>
      <rect x="120" y="160" width="160" height="220" rx="4" fill="#52525b"/>
      <text x="200" y="420" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="16" text-anchor="middle">Sem capa</text>
    </svg>`,
  );

export function resolveBookCoverUrl(cover: string | null | undefined): string {
  return cover?.trim() ? cover.trim() : BOOK_COVER_PLACEHOLDER;
}
