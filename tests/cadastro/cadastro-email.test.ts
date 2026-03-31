import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

describe("cadastro/cadastro-email", () => {
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
});

