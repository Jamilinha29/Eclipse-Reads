import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

describe("cadastro/senha", () => {
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
});

