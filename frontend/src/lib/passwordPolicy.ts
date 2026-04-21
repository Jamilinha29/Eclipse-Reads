/** Política mínima de senha (cadastro). Mantém-se leve — sem dependências pesadas. */

export const SIGNUP_PASSWORD_MIN_LENGTH = 6;

export function signupPasswordMeetsMinimum(password: string): boolean {
  return password.length >= SIGNUP_PASSWORD_MIN_LENGTH;
}

/** Sugestão opcional de UX (não bloqueia cadastro). */
export type PasswordStrength = "weak" | "fair" | "ok";

export function describePasswordStrength(password: string): PasswordStrength {
  if (!signupPasswordMeetsMinimum(password)) return "weak";
  const hasLetter = /[a-zA-ZÀ-ÿ]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-ZÀ-ÿ0-9]/.test(password);
  if (password.length >= 10 && hasLetter && hasDigit && hasSpecial) return "ok";
  if (password.length >= 8 && hasLetter && hasDigit) return "fair";
  if (password.length >= 8 && hasLetter) return "fair";
  return "weak";
}
