import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadLibraryService } from "../helpers/loadApps";
import {
  createAuthClientMock,
  createLibraryServiceClient,
} from "../helpers/supabaseFactories";

describe("perfil/avatar", () => {
  it("gera 500 se a API de autenticação do Supabase lançar exceção", async () => {
    const authClient = createAuthClientMock(() => Promise.reject(new Error("auth outage")));
    const serviceClient = createLibraryServiceClient();

    supabaseCreateClientMock.mockReturnValueOnce(authClient).mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app).get("/library?type=favoritos").set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("auth outage");
  });
});

