import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

describe("upload/formato", () => {
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

