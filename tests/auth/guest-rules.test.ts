/**
 * Regras de convidado espelhadas de `frontend/src/contexts/AuthContext.tsx` (bookLimit).
 */
import { describe, expect, it } from "vitest";

function bookLimitForAuthType(authType: "guest" | "email" | "google" | null): number {
  return authType === "guest" ? 7 : Number.POSITIVE_INFINITY;
}

describe("auth convidado (regras)", () => {
  it("limite de livros 7 para guest", () => {
    expect(bookLimitForAuthType("guest")).toBe(7);
  });

  it("sem limite numérico para email/google/logado", () => {
    expect(bookLimitForAuthType("email")).toBe(Infinity);
    expect(bookLimitForAuthType("google")).toBe(Infinity);
    expect(bookLimitForAuthType(null)).toBe(Infinity);
  });
});
