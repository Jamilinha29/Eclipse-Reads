/** Limite padrão de upload de submissão de livros (50 MB). Backend pode override via env. */
export const DEFAULT_BOOKS_SUBMISSION_MAX_BYTES = 50 * 1024 * 1024;
export const BOOKS_SUBMISSION_MAX_MB = DEFAULT_BOOKS_SUBMISSION_MAX_BYTES / (1024 * 1024);
