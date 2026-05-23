import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createAuthClientMock, createBooksSupabaseMock } from "../helpers/supabaseFactories";

/** Falha ao inserir livro em POST /books (admin) — persistência no catálogo. */
describe("cadastro/confirmacao-senha", () => {
  it("responde 500 e mensagem amigável caso a inserção falhe em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      insertResult: () =>
        Promise.resolve({
          data: null,
          error: { message: "insert failed" },
        }),
    });
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "admin-1" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(supabaseMock).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const response = await request(app)
      .post("/books")
      .set("Authorization", "Bearer tok")
      .send({
        title: "Test",
        author: "QA",
        category: "fic",
        file_path: "x.pdf",
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to create book");
  });
});
