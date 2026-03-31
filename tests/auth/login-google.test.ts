import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createAuthClient, createBaseClient } from "../helpers/supabaseFactories";

describe("auth/login-google", () => {
  it("retorna 500 quando auth.getUser lança exceção e continua atendendo /health", async () => {
    const baseClient = createBaseClient();
    const rejectingClient = createAuthClient(() => Promise.reject(new Error("supabase offline")));

    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockReturnValueOnce(rejectingClient);

    const app = await loadAuthProxy();
    const response = await request(app).get("/validate").set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("supabase offline");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });
});

