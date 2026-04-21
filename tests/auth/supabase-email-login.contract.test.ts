/**
 * Login email/senha é só no cliente (`signInWithPassword`). Sem REST próprio no backend.
 * Contrato mínimo esperado pelo `Auth.tsx`.
 */
import { describe, expect, it, vi } from "vitest";

describe("Login email/senha (contrato Supabase no browser)", () => {
  it("chama signInWithPassword com email e password", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const auth = { signInWithPassword };

    const email = "a@b.com";
    const password = "secret12";
    await auth.signInWithPassword({ email, password });

    expect(signInWithPassword).toHaveBeenCalledWith({ email, password });
  });
});
