import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SupabaseAuthResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args)
}));

const loadAuthProxy = async () => {
  vi.resetModules();
  const mod = await import("../../services/backend/auth-proxy/src/index");
  return mod.default;
};

const createAuthClient = (resolver: () => SupabaseAuthResult<{ user: Record<string, unknown> | null }>) => ({
  auth: {
    getUser: vi.fn().mockImplementation(resolver)
  }
});

const createBaseClient = () => ({
  auth: {
    getUser: vi.fn()
  }
});

beforeEach(() => {
  createClientMock.mockReset();
});

describe("auth-proxy fault tolerance", () => {
  it("retorna 401 quando Supabase responde erro, mantendo o serviço saudável", async () => {
    const baseClient = createBaseClient();
    const failingClient = createAuthClient(() =>
      Promise.resolve({ data: { user: null }, error: { message: "auth down" } })
    );

    createClientMock
      .mockReturnValueOnce(baseClient)
      .mockReturnValueOnce(failingClient);

    const app = await loadAuthProxy();

    const response = await request(app)
      .get("/validate")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("auth down");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });

  it("retorna 500 quando auth.getUser lança exceção e continua atendendo /health", async () => {
    const baseClient = createBaseClient();
    const rejectingClient = createAuthClient(() => Promise.reject(new Error("supabase offline")));

    createClientMock
      .mockReturnValueOnce(baseClient)
      .mockReturnValueOnce(rejectingClient);

    const app = await loadAuthProxy();

    const response = await request(app)
      .get("/validate")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("supabase offline");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });

  it("retorna 500 quando a criação do cliente falha, sem derrubar o serviço", async () => {
    const baseClient = createBaseClient();

    createClientMock
      .mockReturnValueOnce(baseClient)
      .mockImplementationOnce(() => {
        throw new Error("init failed");
      });

    const app = await loadAuthProxy();

    const response = await request(app)
      .get("/validate")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("init failed");
    expect(response.body.valid).toBe(false);

    const health = await request(app).get("/health");
    expect(health.body.status).toBe("ok");
  });
});


