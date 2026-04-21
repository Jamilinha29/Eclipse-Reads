/**
 * library-service: perfil /me/* e upload de mídia (isolado com mocks Supabase).
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadLibraryService } from "../helpers/loadApps";
import {
  authenticatedUser,
  createAuthClientMock,
  createLibraryProfileSupabaseMock,
} from "../helpers/supabaseFactories";

describe("library-service perfil (API)", () => {
  it("GET /library sem Authorization — 401 e mensagem explícita", async () => {
    const app = await loadLibraryService();
    const res = await request(app).get("/library?type=favoritos");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing authorization header/i);
  });

  it("GET /me/profile retorna profile com campos esperados", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock({
      profileSelectResult: () =>
        Promise.resolve({
          data: {
            user_id: "tester",
            username: "Reader",
            avatar_image: null,
            banner_image: null,
          },
          error: null,
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app).get("/me/profile").set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeTruthy();
    expect(res.body.profile.username).toBe("Reader");
  });

  it("GET /me/profile 500 quando Supabase retorna erro na leitura", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock({
      profileSelectResult: () =>
        Promise.resolve({ data: null, error: { message: "relation profiles does not exist" } }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app).get("/me/profile").set("Authorization", "Bearer tok");

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("relation profiles");
  });

  it("PUT /me/profile 400 para username inválido (caixa branca: regra de tamanho/caracteres)", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app)
      .put("/me/profile")
      .set("Authorization", "Bearer tok")
      .send({ username: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nome de usuário inválido/i);
  });

  it("PUT /me/profile 200 persiste alteração simulada", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock({
      profileUpsertResult: () =>
        Promise.resolve({
          data: {
            user_id: "tester",
            username: "Novo Nome",
            avatar_image: null,
            banner_image: null,
          },
          error: null,
        }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app)
      .put("/me/profile")
      .set("Authorization", "Bearer tok")
      .send({ username: "Novo Nome" });

    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe("Novo Nome");
  });

  it("POST /me/profile-media 400 quando arquivo não é imagem", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app)
      .post("/me/profile-media")
      .set("Authorization", "Bearer tok")
      .field("kind", "avatar")
      .attach("file", Buffer.from("%PDF"), { filename: "doc.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/image file required/i);
  });

  it("POST /me/profile-media 500 quando storage.upload falha", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock({
      storageUploadResult: () => Promise.resolve({ error: { message: "quota" } }),
    });
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app)
      .post("/me/profile-media")
      .set("Authorization", "Bearer tok")
      .field("kind", "avatar")
      .attach("file", Buffer.from("fake"), { filename: "a.png", contentType: "image/png" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/upload da imagem/i);
  });

  it("POST /me/profile-media 200 em fluxo feliz (PNG)", async () => {
    const auth = createAuthClientMock(() => Promise.resolve({ data: authenticatedUser, error: null }));
    const svc = createLibraryProfileSupabaseMock();
    supabaseCreateClientMock.mockReturnValueOnce(auth).mockReturnValueOnce(svc);

    const app = await loadLibraryService();
    const res = await request(app)
      .post("/me/profile-media")
      .set("Authorization", "Bearer tok")
      .field("kind", "avatar")
      .attach("file", Buffer.from("fakepng"), { filename: "a.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.publicUrl).toBeDefined();
    expect(res.body.profile).toBeDefined();
  });
});
