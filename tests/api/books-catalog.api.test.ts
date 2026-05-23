/**
 * API books-api: catálogo público GET /books e criação POST /books (admin only).
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createAuthClientMock, createBooksSupabaseMock } from "../helpers/supabaseFactories";

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
    expect(res.body.books[0]).not.toHaveProperty("file_path");
  });

  it("GET /books/:id/file-access 401 sem Authorization", async () => {
    const mock = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const res = await request(app).get("/books/b1/file-access");
    expect(res.status).toBe(401);
  });

  it("GET /images/books/livros/x.pdf 403 — não expõe arquivo de leitura", async () => {
    const mock = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const res = await request(app).get("/images/books/livros/x.pdf");
    expect(res.status).toBe(403);
  });

  it("POST /books 401 sem Authorization", async () => {
    const mock = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(mock);

    const app = await loadBooksApi();
    const res = await request(app).post("/books").send({ title: "Novo", author: "Autor" });
    expect(res.status).toBe(401);
  });

  it("POST /books 400 quando campos obrigatórios ausentes (admin)", async () => {
    const mock = createBooksSupabaseMock();
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "admin-1" } }, error: null })
    );
    supabaseCreateClientMock
      .mockReturnValueOnce(mock)
      .mockReturnValueOnce(auth)
      .mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const emptyTitle = await request(app)
      .post("/books")
      .set("Authorization", "Bearer tok")
      .send({ title: "   ", author: "A", category: "fic", file_path: "x.pdf" });
    expect(emptyTitle.status).toBe(400);
    expect(emptyTitle.body.error).toMatch(/title, author, category and file_path/i);

    const missing = await request(app)
      .post("/books")
      .set("Authorization", "Bearer tok")
      .send({ author: "A" });
    expect(missing.status).toBe(400);
  });

  it("POST /books 201 e body.book quando insert OK (admin)", async () => {
    const mock = createBooksSupabaseMock({
      insertResult: () =>
        Promise.resolve({
          data: { id: "new-id", title: "Novo", author: "Autor" },
          error: null,
        }),
    });
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "admin-1" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(mock).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/books")
      .set("Authorization", "Bearer tok")
      .send({
        title: "  Novo  ",
        author: "  Autor  ",
        category: "fic",
        file_path: "livros/book.pdf",
        file_type: "pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.book.id).toBe("new-id");
    expect(res.body.book.title).toBe("Novo");
    expect(res.body.book.author).toBe("Autor");
  });
});
