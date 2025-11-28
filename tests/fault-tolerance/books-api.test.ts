import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SupabaseResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args)
}));

beforeEach(() => {
  createClientMock.mockReset();
});

const loadBooksApi = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/books-api/src/index");
  return mod.default;
};

type BooksMockConfig = {
  listResult?: () => SupabaseResult;
  singleResult?: () => SupabaseResult;
  insertResult?: () => SupabaseResult;
};

const createBooksSupabaseMock = (config: BooksMockConfig = {}) => {
  const listResult = config.listResult ?? (() => Promise.resolve({ data: [], error: null }));
  const singleResult = config.singleResult ?? (() => Promise.resolve({ data: { id: "1" }, error: null }));
  const insertResult = config.insertResult ?? (() => Promise.resolve({ data: { id: "generated" }, error: null }));

  const selectBuilder = {
    order: vi.fn().mockImplementation(() => listResult()),
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockImplementation(() => singleResult())
    })
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "books") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: vi.fn().mockReturnValue(selectBuilder),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => insertResult())
          })
        })
      };
    })
  };
};

describe("books-api fault tolerance", () => {
  it("retorna 500 sem derrubar o servidor quando o banco falha em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      listResult: () => Promise.resolve({
        data: null,
        error: { message: "db unreachable" }
      })
    });
    createClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app).get("/books");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("db unreachable");

    const metrics = await request(app).get("/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.body.requests).toBe(1);
  });

  it("mantém o serviço vivo quando ocorre exceção inesperada em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      listResult: () => Promise.reject(new Error("network timeout"))
    });
    createClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app).get("/books");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("network timeout");

    const health = await request(app).get("/health");
    expect(health.body.status).toBe("ok");
  });

  it("responde 500 e mensagem amigável caso a inserção falhe em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      insertResult: () => Promise.resolve({
        data: null,
        error: { message: "insert failed" }
      })
    });
    createClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app)
      .post("/books")
      .send({ title: "Test", author: "QA" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to create book");
  });

  it("retorna 500 em /books/:id quando Supabase falha, sem travar a API", async () => {
    const supabaseMock = createBooksSupabaseMock({
      singleResult: () => Promise.resolve({
        data: null,
        error: { message: "read failure" }
      })
    });
    createClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app).get("/books/123");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("read failure");
  });
});

