/**
 * Regras de formulário de cadastro alinhadas a `Auth.tsx` + `@/lib/passwordPolicy`.
 */
import { describe, expect, it } from "vitest";
import { signupPasswordMeetsMinimum } from "@/lib/passwordPolicy";

type SignupCheck =
  | { ok: true }
  | { ok: false; reason: "empty_fields" | "password_mismatch" | "password_too_short" };

function evaluateSignupForm(email: string, password: string, confirmPassword: string, name: string): SignupCheck {
  if (!email || !password || !name) return { ok: false, reason: "empty_fields" };
  if (password !== confirmPassword) return { ok: false, reason: "password_mismatch" };
  if (!signupPasswordMeetsMinimum(password)) return { ok: false, reason: "password_too_short" };
  return { ok: true };
}

describe("cadastro signup (regras client-side)", () => {
  it("bloqueia campos vazios", () => {
    expect(evaluateSignupForm("", "secret1", "secret1", "Nome").ok).toBe(false);
    expect(evaluateSignupForm("a@b.com", "", "", "Nome").reason).toBe("empty_fields");
  });

  it("bloqueia confirmação diferente da senha", () => {
    const r = evaluateSignupForm("a@b.com", "secret1", "secret2", "Nome");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("password_mismatch");
  });

  it("bloqueia senha com menos de 6 caracteres (política atual do app)", () => {
    const r = evaluateSignupForm("a@b.com", "12345", "12345", "Nome");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("password_too_short");
  });

  it("aceita cadastro mínimo válido", () => {
    expect(evaluateSignupForm("user@example.com", "123456", "123456", "Nome").ok).toBe(true);
  });
});
