import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

/** Falha ao inserir livro em POST /books — espelha persistência “confirmação” no fluxo de catálogo, não confirmação de senha no auth. */
describe("cadastro/confirmacao-senha", () => {
  it("responde 500 e mensagem amigável caso a inserção falhe em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      insertResult: () =>
        Promise.resolve({
          data: null,
          error: { message: "insert failed" },
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(supabaseMock);

    const app = await loadBooksApi();
    const response = await request(app).post("/books").send({ title: "Test", author: "QA" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to create book");
  });
});

