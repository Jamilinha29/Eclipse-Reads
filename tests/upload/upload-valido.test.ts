import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadLibraryService } from "../helpers/loadApps";
import {
  authenticatedUser,
  createAuthClientMock,
  createLibraryServiceClient,
} from "../helpers/supabaseFactories";

describe("upload/upload-valido", () => {
  it("retorna 500 quando a tabela relacional falha e mantém o processo vivo", async () => {
    const authClient = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const serviceClient = createLibraryServiceClient({
      relationshipResult: () => Promise.resolve({ data: null, error: { message: "relationship down" } }),
    });

    supabaseCreateClientMock.mockReturnValueOnce(authClient).mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app).get("/library?type=favoritos").set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("relationship down");

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });
});

