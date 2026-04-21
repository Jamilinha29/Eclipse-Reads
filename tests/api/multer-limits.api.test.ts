/**
 * Limites Multer configuráveis por env (sem ficheiros gigantes no CI).
 */
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadBooksApi } from "../helpers/loadApps";
import { createBooksSupabaseMock } from "../helpers/supabaseFactories";

describe("multer limits (API)", () => {
  const prevSub = process.env.BOOKS_SUBMISSION_MAX_BYTES;
  const prevProf = process.env.PROFILE_MEDIA_MAX_BYTES;

  afterEach(() => {
    if (prevSub !== undefined) process.env.BOOKS_SUBMISSION_MAX_BYTES = prevSub;
    else delete process.env.BOOKS_SUBMISSION_MAX_BYTES;
    if (prevProf !== undefined) process.env.PROFILE_MEDIA_MAX_BYTES = prevProf;
    else delete process.env.PROFILE_MEDIA_MAX_BYTES;
  });

  it("POST /submissions 413 quando ficheiro excede BOOKS_SUBMISSION_MAX_BYTES", async () => {
    process.env.BOOKS_SUBMISSION_MAX_BYTES = "800";

    const service = createBooksSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(service);

    const { loadBooksApi: load } = await import("../helpers/loadApps");
    const app = await load();
    const res = await request(app)
      .post("/submissions")
      .set("Authorization", "Bearer t")
      .field("title", "T")
      .field("author", "A")
      .field("description", "D")
      .field("category", "C")
      .attach("file", Buffer.alloc(1200, 1), { filename: "big.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(413);
    expect(String(res.body.error)).toMatch(/large|max|MB/i);
  });

  it("POST /me/profile-media 413 quando imagem excede PROFILE_MEDIA_MAX_BYTES", async () => {
    process.env.PROFILE_MEDIA_MAX_BYTES = "500";

    const { loadLibraryService: loadLib } = await import("../helpers/loadApps");
    const app = await loadLib();
    const res = await request(app)
      .post("/me/profile-media")
      .set("Authorization", "Bearer t")
      .field("kind", "avatar")
      .attach("file", Buffer.alloc(800, 2), { filename: "x.png", contentType: "image/png" });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/grande|limite/i);
  });
});
