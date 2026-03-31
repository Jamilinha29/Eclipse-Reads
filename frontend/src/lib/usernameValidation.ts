const USERNAME_ALLOWED_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/u;

export const USERNAME_VALIDATION_MESSAGE =
  "Use apenas letras e espaços (sem números ou caracteres especiais).";

export const normalizeUsername = (value: string) => value.replace(/\s+/g, " ").trim();

export const isValidUsername = (value: string) => {
  const normalized = normalizeUsername(value);
  return normalized.length >= 3 && USERNAME_ALLOWED_REGEX.test(normalized);
};

