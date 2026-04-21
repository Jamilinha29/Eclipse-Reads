/**
 * Caixa preta + integração: auth-proxy `/validate` (validação de Bearer com Supabase).
 * Substitui cenários antes espalhados em login-email / login-google / guest-access.
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createAuthClient, createBaseClient } from "../helpers/supabaseFactories";

describe("auth-proxy GET /validate (API)", () => {
  it("401 sem header Authorization — body indica motivo", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate");

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe("no auth header");
  });

  it("200 com token válido — retorna user e valid true", async () => {
    const baseClient = createBaseClient();
    const okClient = createAuthClient(() =>
      Promise.resolve({
        data: { user: { id: "u-1", email: "reader@example.com", app_metadata: {} } },
        error: null,
      })
    );
    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(okClient);

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate").set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.user?.id).toBe("u-1");
    expect(res.body.user?.email).toBe("reader@example.com");
  });

  it("401 quando Supabase devolve erro em getUser — mensagem propagada", async () => {
    const baseClient = createBaseClient();
    const failingClient = createAuthClient(() =>
      Promise.resolve({ data: { user: null }, error: { message: "Invalid JWT" } })
    );
    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(failingClient);

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate").set("Authorization", "Bearer bad");

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain("Invalid JWT");
  });

  it("500 quando getUser rejeita — serviço continua com /health OK", async () => {
    const baseClient = createBaseClient();
    const rejectingClient = createAuthClient(() => Promise.reject(new Error("supabase offline")));
    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(rejectingClient);

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate").set("Authorization", "Bearer x");

    expect(res.status).toBe(500);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain("supabase offline");

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });

  it("500 quando createClient do handler falha — não derruba o processo", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock
      .mockReturnValueOnce(baseClient)
      .mockImplementationOnce(() => {
        throw new Error("init failed");
      });

    const app = await loadAuthProxy();
    const res = await request(app).get("/validate").set("Authorization", "Bearer x");

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("init failed");

    const health = await request(app).get("/health");
    expect(health.body.status).toBe("ok");
  });
});
