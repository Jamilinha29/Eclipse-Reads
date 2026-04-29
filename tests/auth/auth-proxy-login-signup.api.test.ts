/**
 * POST /login e POST /signup | /cadastro — delegação ao Supabase (signInWithPassword / signUp).
 */
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { supabaseCreateClientMock } from "../mocks/supabaseRegistry";
import { loadAuthProxy } from "../helpers/loadApps";
import { createBaseClient } from "../helpers/supabaseFactories";

describe("auth-proxy POST /login (API)", () => {
  it("400 sem email ou password", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/login").send({ email: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("obrigatórios");
    expect(baseClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("200 com credenciais — retorna tokens e user", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/login").send({ email: "a@b.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBe("mock-access-token");
    expect(res.body.user?.email).toBe("login@example.com");
    expect(baseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret12",
    });
  });

  it("401 quando Supabase devolve erro", async () => {
    const baseClient = createBaseClient();
    baseClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/login").send({ email: "x@y.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid login credentials");
  });
});

describe("auth-proxy POST /signup e /cadastro (API)", () => {
  it("400 senha curta", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/signup").send({ email: "a@b.com", password: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("6 caracteres");
    expect(baseClient.auth.signUp).not.toHaveBeenCalled();
  });

  it("202 quando conta criada mas sessão null (confirmação por e-mail)", async () => {
    const baseClient = createBaseClient();
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app)
      .post("/cadastro")
      .send({ email: "new@b.com", password: "123456", full_name: "Nome" });

    expect(res.status).toBe(202);
    expect(res.body.needs_email_confirmation).toBe(true);
    expect(res.body.access_token).toBeNull();
    expect(baseClient.auth.signUp).toHaveBeenCalledWith({
      email: "new@b.com",
      password: "123456",
      options: { data: { full_name: "Nome" } },
    });
  });

  it("201 quando já devolve sessão", async () => {
    const baseClient = createBaseClient();
    baseClient.auth.signUp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "tok",
          refresh_token: "rt",
          expires_in: 3600,
          expires_at: 1,
          token_type: "bearer",
        },
        user: { id: "id", email: "z@z.com" },
      },
      error: null,
    });
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/signup").send({ email: "z@z.com", password: "123456" });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBe("tok");
    expect(res.body.needs_email_confirmation).toBe(false);
  });

  it("400 quando Supabase devolve erro no signUp", async () => {
    const baseClient = createBaseClient();
    baseClient.auth.signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    });
    supabaseCreateClientMock.mockReturnValueOnce(baseClient);

    const app = await loadAuthProxy();
    const res = await request(app).post("/signup").send({ email: "dup@b.com", password: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("already registered");
  });
});
