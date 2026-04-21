/**
 * Caixa branca: mesmas regras que `frontend/src/lib/usernameValidation.ts` e library-service.
 */
import { describe, expect, it } from "vitest";
import { isValidUsername, normalizeUsername } from "@/lib/usernameValidation";

describe("usernameValidation (frontend)", () => {
  it("normaliza espaços extras", () => {
    expect(normalizeUsername("  a  b  ")).toBe("a b");
  });

  it("rejeita menos de 3 caracteres úteis", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a  ")).toBe(false);
  });

  it("aceita letras com acentos e espaços (≥3)", () => {
    expect(isValidUsername("João Silva")).toBe(true);
    expect(isValidUsername("Öykü")).toBe(true);
  });

  it("rejeita dígitos e símbolos", () => {
    expect(isValidUsername("João2")).toBe(false);
    expect(isValidUsername("a@b")).toBe(false);
  });
});
