import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Carrega as variáveis de ambiente do arquivo auth-proxy.env
dotenv.config({ path: path.join(process.cwd(), '../envs/auth-proxy.env') });

const app = express();
app.use(cors());
app.use(express.json());

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
app.listen(PORT, () => console.log(`auth-proxy listening on ${PORT}`));

export default app;
