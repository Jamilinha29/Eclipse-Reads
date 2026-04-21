/**
 * O auth-proxy apenas repete `error.message` do Supabase em 401 — não classifica códigos.
 *
 * Sessão / token:
 * - Renovar: no app use `supabase.auth.refreshSession()` ou novo login.
 * - Expiração global: Supabase Dashboard → Authentication → JWT expiry (ou project API settings).
 * - Outro emissor de JWT: não suportado sem trocar o cliente Supabase.
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createAuthClient, createBaseClient } from "../helpers/supabaseFactories";

describe("auth-proxy JWT — mensagens Supabase (API)", () => {
  it("401 com corpo de erro quando getUser indica JWT expirado", async () => {
    const baseClient = createBaseClient();
    const expiredClient = createAuthClient(() =>
      Promise.resolve({
        data: { user: null },
        error: { message: "JWT expired" },
      })
    );
    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(expiredClient);

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate").set("Authorization", "Bearer eyJ...");

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(String(res.body.error)).toMatch(/expired/i);
  });
});
