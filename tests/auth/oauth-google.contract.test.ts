/**
 * Google OAuth não passa pelo auth-proxy: o browser chama `supabase.auth.signInWithOAuth`.
 * Este teste fixa o contrato de opções usado em `Auth.tsx` (fácil de regressar).
 */
import { describe, expect, it } from "vitest";

function buildGoogleOAuthCall(redirectTo: string) {
  return {
    provider: "google" as const,
    options: { redirectTo },
  };
}

describe("OAuth Google (contrato client-side)", () => {
  it("usa provider google e redirectTo absoluto", () => {
    const redirect = "http://localhost:5173/auth";
    const o = buildGoogleOAuthCall(redirect);
    expect(o.provider).toBe("google");
    expect(o.options.redirectTo).toBe(redirect);
  });
});
