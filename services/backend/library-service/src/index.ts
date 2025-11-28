import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Carrega as variáveis de ambiente do arquivo library-service.env
dotenv.config({ path: path.join(process.cwd(), '../envs/library-service.env') });

const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables!");
  console.log("SUPABASE_URL:", SUPABASE_URL ? "✓ Set" : "❌ Not set");
  console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✓ Set" : "❌ Not set");
  console.log("SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY ? "✓ Set" : "❌ Not set");
  process.exit(1);
}

app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

// GET /library?type=favoritos  (or 'lendo' or 'lidos')
// Requires Authorization: Bearer <token>
app.get("/library", async (req: Request, res: Response) => {
  try {
    const authHeader = req.header("authorization") ?? "";
    if (!authHeader) return res.status(401).json({ error: "missing authorization header" });

    // transient client with auth header to get user
    const clientWithHeader = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userErr } = await clientWithHeader.auth.getUser();
    if (userErr) return res.status(401).json({ error: userErr.message });
    const user = userData.user;
    if (!user) return res.status(401).json({ error: "not authenticated" });

    const type = (req.query.type as string) ?? "favoritos";
    let tableName = "favorites";
    if (type === "lendo") tableName = "reading";
    else if (type === "lidos") tableName = "read";
    else if (type === "favoritos") tableName = "favorites";

    // Use service_role key to query cross-table (safer)
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // buscar ids na tabela de relacionamento (assume tabela com user_id e book_id)
    const { data: bookIdsData, error: idsError } = await svc
      .from(tableName)
      .select("book_id")
      .eq("user_id", user.id);

    if (idsError) return res.status(500).json({ error: idsError.message });

    const ids = (bookIdsData ?? []).map((r: any) => r.book_id).filter(Boolean);
    if (ids.length === 0) return res.json({ books: [] });

    // buscar livros por ids
    const { data: books, error: booksError } = await svc.from("books").select("*").in("id", ids);
    if (booksError) return res.status(500).json({ error: booksError.message });

    return res.json({ books });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
  }
});

const PORT = Number(process.env.PORT ?? 4200);
if (NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`library-service listening on ${PORT}`));
}

export default app;
