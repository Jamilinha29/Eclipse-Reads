import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createAuthClient, createBaseClient } from "../helpers/supabaseFactories";

describe("auth/login-email", () => {
  it("retorna 401 quando Supabase responde erro, mantendo o serviço saudável", async () => {
    const baseClient = createBaseClient();
    const failingClient = createAuthClient(() =>
      Promise.resolve({ data: { user: null }, error: { message: "auth down" } })
    );

    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(failingClient);

    const app = await loadAuthProxy();
    const response = await request(app).get("/validate").set("authorization", "Bearer token");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("auth down");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });
});

