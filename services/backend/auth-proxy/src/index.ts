import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    ws as unknown as typeof WebSocket;
}
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../envs/auth-proxy.env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

const NODE_ENV = process.env.NODE_ENV ?? "development";

function parseAllowedOrigins(fallback: string[]): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return fallback;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://eclipse-reads.vercel.app",
];
const allowedOrigins = parseAllowedOrigins(defaultOrigins);

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);
app.use(express.json());
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use((req, res, next) => {
  if (NODE_ENV !== "production") {
    console.log(`[Vercel Proxy] Auth Proxy Hit: ${req.url}`);
  }
  if (req.url.startsWith("/api/auth")) {
    req.url = req.url.slice("/api/auth".length);
  }
  if (!req.url.startsWith("/")) req.url = "/" + req.url;
  next();
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set!");
  process.exit(1);
}

const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request, scope: string): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip ?? "unknown";
  return `${scope}:${ip}`;
}

function rateLimit(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, scope);
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > RATE_MAX) {
      return res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    }
    return next();
  };
}

function authErrorMessage(status: number, detail?: string): string {
  if (NODE_ENV === "test" && detail) return detail;
  if (status === 401) return "E-mail ou senha inválidos.";
  if (status === 400) return detail && detail.length < 120 ? detail : "Dados inválidos.";
  return "Erro ao processar autenticação.";
}

app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

app.post("/login", rateLimit("login"), async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios" });
    }

    const { data, error } = await baseClient.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: authErrorMessage(401, error.message) });
    }

    const session = data.session;
    const user = data.user;
    return res.status(200).json({
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_in: session?.expires_in ?? null,
      expires_at: session?.expires_at ?? null,
      token_type: session?.token_type ?? "bearer",
      user: user ? { id: user.id, email: user.email } : null,
    });
  } catch {
    return res.status(500).json({ error: "Erro interno ao autenticar." });
  }
});

const signupHandler = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const full_name =
      typeof req.body?.full_name === "string" ? req.body.full_name.trim() : undefined;

    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "senha deve ter no mínimo 6 caracteres" });
    }

    const { data, error } = await baseClient.auth.signUp({
      email,
      password,
      ...(full_name ? { options: { data: { full_name } } } : {}),
    });
    if (error) {
      return res.status(400).json({ error: authErrorMessage(400, error.message) });
    }

    const session = data.session;
    const user = data.user;
    const needsEmailConfirmation = !session && !!user;
    const status = session ? 201 : 202;

    return res.status(status).json({
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_in: session?.expires_in ?? null,
      expires_at: session?.expires_at ?? null,
      token_type: session?.token_type ?? "bearer",
      user: user ? { id: user.id, email: user.email } : null,
      needs_email_confirmation: needsEmailConfirmation,
    });
  } catch {
    return res.status(500).json({ error: "Erro interno ao cadastrar." });
  }
};

app.post("/signup", rateLimit("signup"), signupHandler);
app.post("/cadastro", rateLimit("signup"), signupHandler);

app.post("/refresh", rateLimit("refresh"), async (req: Request, res: Response) => {
  try {
    const refresh_token = typeof req.body?.refresh_token === "string" ? req.body.refresh_token : "";
    if (!refresh_token) return res.status(400).json({ error: "refresh_token é obrigatório" });

    const { data, error } = await baseClient.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: authErrorMessage(401, error.message) });

    const session = data.session;
    return res.json({
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_in: session?.expires_in ?? null,
      expires_at: session?.expires_at ?? null,
      token_type: session?.token_type ?? "bearer",
    });
  } catch {
    return res.status(500).json({ error: "Erro ao renovar sessão." });
  }
});

app.post("/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.header("authorization") ?? "";
    if (!authHeader) return res.status(401).json({ error: "Authorization header required" });

    const clientWithHeader = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error } = await clientWithHeader.auth.signOut();
    if (error) return res.status(400).json({ error: authErrorMessage(400, error.message) });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erro ao encerrar sessão." });
  }
});

app.get("/validate", async (req: Request, res: Response) => {
  try {
    const authHeader = req.header("authorization") ?? "";
    if (!authHeader) return res.status(401).json({ valid: false, reason: "no auth header" });

    const clientWithHeader = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await clientWithHeader.auth.getUser();
    if (error) {
      return res.status(401).json({
        valid: false,
        error: NODE_ENV === "test" ? error.message : "Token inválido.",
      });
    }

    const user = data.user;
    return res.json({
      valid: !!user,
      user: user ? { id: user.id, email: user.email } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      valid: false,
      error: NODE_ENV === "test" ? message : "Erro interno.",
    });
  }
});

const PORT = Number(process.env.PORT ?? 4100);

let server: ReturnType<typeof app.listen> | undefined;

if (NODE_ENV !== "test" && !process.env.VERCEL) {
  server = app.listen(PORT, () => console.log(`auth-proxy listening on ${PORT}`));
}

process.on("SIGTERM", () => {
  server?.close(() => process.exit(0));
});

export default app;
