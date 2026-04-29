import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

import { existsSync } from "fs";

// Carrega as variáveis de ambiente do arquivo auth-proxy.env apenas se existir localmente
const envPath = path.join(process.cwd(), '../envs/auth-proxy.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para lidar com o prefixo da Vercel
app.use((req, res, next) => {
  console.log(`[Vercel Proxy] Auth Proxy Hit: ${req.url}`);
  if (req.url.startsWith('/api/auth')) {
    req.url = req.url.slice('/api/auth'.length);
  }
  if (!req.url.startsWith('/')) req.url = '/' + req.url;
  next();
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set!");
  console.log("SUPABASE_URL:", SUPABASE_URL ? "✓ Set" : "❌ Not set");
  console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✓ Set" : "❌ Not set");
  process.exit(1);
}

// This client is used for checking user from token: we will create client with anon key but pass header Authorization
const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

/** Login com e-mail/senha (equivale a `signInWithPassword` no frontend). */
app.post("/login", async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios" });
    }

    const { data, error } = await baseClient.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const session = data.session;
    const user = data.user;
    return res.status(200).json({
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_in: session?.expires_in ?? null,
      expires_at: session?.expires_at ?? null,
      token_type: session?.token_type ?? "bearer",
      user: user ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
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
      return res.status(400).json({ error: error.message });
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
      user: user ?? null,
      needs_email_confirmation: needsEmailConfirmation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
};

app.post("/signup", signupHandler);
app.post("/cadastro", signupHandler);

// Validate token by passing Authorization header to supabase client and calling auth.getUser()
app.get("/validate", async (req: Request, res: Response) => {
  try {
    const authHeader = req.header("authorization") ?? "";
    if (!authHeader) return res.status(401).json({ valid: false, reason: "no auth header" });

    // Create transient client with header
    const clientWithHeader = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data, error } = await clientWithHeader.auth.getUser();
    if (error) return res.status(401).json({ valid: false, error: error.message });

    return res.json({ valid: !!data.user, user: data.user ?? null });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message ?? String(err) });
  }
});

const PORT = Number(process.env.PORT ?? 4100);

if (NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`auth-proxy listening on ${PORT}`));
}

export default app;
