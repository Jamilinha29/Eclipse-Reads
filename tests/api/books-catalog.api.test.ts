/**
 * API books-api: catálogo público GET /books e criação POST /books (sem fluxo Supabase Auth no browser).
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

describe("books-api catálogo (API)", () => {
  it("GET /books retorna lista apenas de itens com file_path e estrutura esperada", async () => {
    const mock = createBooksSupabaseMock({
      listResult: () =>
        Promise.resolve({
          data: [
            {
              id: "b1",
              title: "Imported",
              author: "QA",
              category: "fic",
              cover_image: null,
              rating: 5,
              age_rating: null,
              created_at: "2020-01-01",
              file_path: "books/a.pdf",
            },
            {
              id: "b2",
              title: "Draft",
              author: "X",
              category: "fic",
              cover_image: null,
              rating: 0,
              age_rating: null,
              created_at: "2020-01-02",
              file_path: " ",
            },
          ],
          error: null,
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const res = await request(app).get("/books");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.books)).toBe(true);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0].id).toBe("b1");
    expect(res.body.books[0]).toHaveProperty("cover_image");
  });

  it("POST /books 400 quando title ou author ausentes ou vazios", async () => {
    const mock = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const emptyTitle = await request(app).post("/books").send({ title: "   ", author: "A" });
    expect(emptyTitle.status).toBe(400);
    expect(emptyTitle.body.error).toMatch(/title and author/i);

    const missing = await request(app).post("/books").send({ author: "A" });
    expect(missing.status).toBe(400);
  });

  it("POST /books 201 e body.book quando insert OK", async () => {
    const mock = createBooksSupabaseMock({
      insertResult: () =>
        Promise.resolve({
          data: { id: "new-id", title: "Novo", author: "Autor" },
          error: null,
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const res = await request(app).post("/books").send({ title: "  Novo  ", author: "  Autor  " });

    expect(res.status).toBe(201);
    expect(res.body.book.id).toBe("new-id");
    expect(res.body.book.title).toBe("Novo");
    expect(res.body.book.author).toBe("Autor");
  });
});
