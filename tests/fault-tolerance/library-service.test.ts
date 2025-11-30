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

const loadLibraryService = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/library-service/src/index");
  return mod.default;
};

const createAuthClientMock = (resolver: () => SupabaseResult<{ user: { id: string } }>) => ({
  auth: {
    getUser: vi.fn().mockImplementation(() => resolver())
  }
});

type LibraryServiceConfig = {
  relationshipResult?: () => SupabaseResult<Array<{ book_id: string }>>;
  booksResult?: () => SupabaseResult<Array<Record<string, unknown>>>;
};

const createLibraryServiceClient = (config: LibraryServiceConfig = {}) => {
  const relationshipResult = config.relationshipResult ?? (() => Promise.resolve({ data: [{ book_id: "1" }], error: null }));
  const booksResult = config.booksResult ?? (() => Promise.resolve({ data: [{ id: "1" }], error: null }));

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "favorites" || table === "reading" || table === "read") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => relationshipResult())
          })
        };
      }

      if (table === "books") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(() => booksResult())
          })
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  };
};

const authenticatedUser = { user: { id: "tester" } };

describe("library-service fault tolerance", () => {
  it("retorna 500 quando a tabela relacional falha e mantém o processo vivo", async () => {
    const authClient = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const serviceClient = createLibraryServiceClient({
      relationshipResult: () => Promise.resolve({ data: null, error: { message: "relationship down" } })
    });

    createClientMock
      .mockReturnValueOnce(authClient)
      .mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app)
      .get("/library?type=favoritos")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("relationship down");

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });

  it("retorna 500 quando a busca dos livros falha depois de recuperar os ids", async () => {
    const authClient = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const serviceClient = createLibraryServiceClient({
      booksResult: () => Promise.resolve({ data: null, error: { message: "books table timeout" } })
    });

    createClientMock
      .mockReturnValueOnce(authClient)
      .mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app)
      .get("/library?type=favoritos")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("books table timeout");
  });

  it("gera 500 se a API de autenticação do Supabase lançar exceção", async () => {
    const authClient = createAuthClientMock(() => Promise.reject(new Error("auth outage")));
    const serviceClient = createLibraryServiceClient();

    createClientMock
      .mockReturnValueOnce(authClient)
      .mockReturnValueOnce(serviceClient);

    const app = await loadLibraryService();
    const response = await request(app)
      .get("/library?type=favoritos")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("auth outage");
  });
});

