/**
 * Upload de submissões de livro: POST /submissions (multipart), auth via requireUser.
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createAuthClientMock, createBooksSupabaseMock } from "../helpers/supabaseFactories";

const pdfBuffer = Buffer.from("%PDF-1.4 test");

describe("books-api submissions (API)", () => {
  it("401 quando não envia Authorization em POST /submissions", async () => {
    const service = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(service);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .field("title", "T")
      .field("author", "A")
      .field("description", "D")
      .field("category", "C")
      .attach("file", pdfBuffer, { filename: "book.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Erro ao processar nova submissão.");
  });

  it("400 quando faltam campos obrigatórios ou arquivo", async () => {
    const service = createBooksSupabaseMock();
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "user-1", email: "a@b.com" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(service).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer tok")
      .field("title", "T");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("400 para extensão de arquivo não permitida", async () => {
    const service = createBooksSupabaseMock();
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "user-1", email: "a@b.com" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(service).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer tok")
      .field("title", "T")
      .field("author", "A")
      .field("description", "D")
      .field("category", "C")
      .attach("file", Buffer.from("x"), { filename: "hack.exe", contentType: "application/octet-stream" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid file type/i);
  });

  it("201 e submission quando upload e insert bem-sucedidos", async () => {
    const service = createBooksSupabaseMock({
      submissionInsertResult: () =>
        Promise.resolve({
          data: { id: "sub-x", status: "pending", title: "T" },
          error: null,
        }),
    });
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "user-1", email: "a@b.com" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(service).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer tok")
      .field("title", "Título")
      .field("author", "Autor")
      .field("description", "Desc")
      .field("category", "Ficção")
      .attach("file", pdfBuffer, { filename: "livro.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.submission).toBeDefined();
    expect(res.body.submission.id).toBe("sub-x");
  });

  it("500 quando storage.upload falha", async () => {
    const service = createBooksSupabaseMock({
      storageUploadResult: () => Promise.resolve({ error: { message: "bucket unavailable" } }),
    });
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "user-1", email: "a@b.com" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(service).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer tok")
      .field("title", "T")
      .field("author", "A")
      .field("description", "D")
      .field("category", "C")
      .attach("file", pdfBuffer, { filename: "x.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("bucket unavailable");
  });

  it("500 quando insert em book_submissions falha", async () => {
    const service = createBooksSupabaseMock({
      submissionInsertResult: () =>
        Promise.resolve({ data: null, error: { message: "unique violation" } }),
    });
    const auth = createAuthClientMock(() =>
      Promise.resolve({ data: { user: { id: "user-1", email: "a@b.com" } }, error: null })
    );
    supabaseCreateClientMock.mockReturnValueOnce(service).mockReturnValueOnce(auth);

    const app = await loadBooksApi();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer tok")
      .field("title", "T")
      .field("author", "A")
      .field("description", "D")
      .field("category", "C")
      .attach("file", pdfBuffer, { filename: "x.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erro ao salvar dados da submissão.");
  });
});
