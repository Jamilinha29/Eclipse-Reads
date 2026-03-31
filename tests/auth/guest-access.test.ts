import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createBaseClient } from "../helpers/supabaseFactories";

describe("auth/guest-access", () => {
  it("retorna 500 quando a criação do cliente falha, sem derrubar o serviço", async () => {
    const baseClient = createBaseClient();

    supabaseCreateClientMock.mockReturnValueOnce(baseClient).mockImplementationOnce(() => {
      throw new Error("init failed");
    });

    const app = await loadAuthProxy();
    const response = await request(app).get("/validate").set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("init failed");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.body.status).toBe("ok");
  });
});

