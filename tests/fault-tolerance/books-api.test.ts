import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";

type SupabaseResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

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

  const createSelectBuilder = () => {
    const builder: {
      order: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      then: typeof Promise.prototype.then;
      catch: typeof Promise.prototype.catch;
    } = {
      order: vi.fn(() => builder),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => singleResult()),
        })),
        maybeSingle: vi.fn(() => singleResult()),
      })),
      then: ((onFulfilled, onRejected) =>
        Promise.resolve(listResult()).then(onFulfilled as never, onRejected)) as typeof Promise.prototype.then,
      catch: ((onRejected) => Promise.resolve(listResult()).catch(onRejected)) as typeof Promise.prototype.catch,
    };
    return builder;
  };

  const storageFrom = vi.fn(() => ({
    list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    download: vi.fn(() => Promise.resolve({ data: null, error: { message: "no file" } })),
    upload: vi.fn(() => Promise.resolve({ error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://test" } })),
    remove: vi.fn(() => Promise.resolve({ error: null })),
  }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "books") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: vi.fn().mockImplementation(() => createSelectBuilder()),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => insertResult()),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(() => singleResult()),
            }),
          }),
        }),
      };
    }),
    storage: {
      from: storageFrom,
    },
  };
};

describe("books-api fault tolerance", () => {
  it("retorna 500 sem derrubar o servidor quando o banco falha em /books", async () => {
    const supabaseMock = createBooksSupabaseMock({
      listResult: () =>
        Promise.resolve({
          data: null,
          error: { message: "db unreachable" },
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(supabaseMock);
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
      listResult: () => Promise.reject(new Error("network timeout")),
    });
    supabaseCreateClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app).get("/books");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("network timeout");

    const health = await request(app).get("/health");
    expect(health.body.status).toBe("ok");
  });

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

  it("retorna 500 em /books/:id quando Supabase falha, sem travar a API", async () => {
    const supabaseMock = createBooksSupabaseMock({
      singleResult: () =>
        Promise.resolve({
          data: null,
          error: { message: "read failure" },
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(supabaseMock);
    const app = await loadBooksApi();

    const response = await request(app).get("/books/123");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("read failure");
  });
});
