import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadLibraryService } from "../helpers/loadApps";
import {
  authenticatedUser,
  createAuthClientMock,
  createLibraryServiceClient,
} from "../helpers/supabaseFactories";

describe("upload/upload-invalido", () => {
  it("retorna 500 quando a busca dos livros falha depois de recuperar os ids", async () => {
    const authClient = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const serviceClient = createLibraryServiceClient({
      booksResult: () => Promise.resolve({ data: null, error: { message: "books table timeout" } }),
    });

    supabaseCreateClientMock.mockReturnValueOnce(authClient).mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app).get("/library?type=favoritos").set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("books table timeout");
  });
});

