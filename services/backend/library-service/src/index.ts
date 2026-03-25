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

const requireAuthHeader = (req: Request) => {
  const authHeader = req.header("authorization") ?? "";
  if (!authHeader) throw Object.assign(new Error("missing authorization header"), { statusCode: 401 });
  return authHeader;
};

const getUserFromAuthHeader = async (authHeader: string) => {
  const clientWithHeader = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userErr } = await clientWithHeader.auth.getUser();
  if (userErr) throw Object.assign(new Error(userErr.message), { statusCode: 401 });
  const user = userData.user;
  if (!user) throw Object.assign(new Error("not authenticated"), { statusCode: 401 });
  return user;
};

const svcClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// GET /library?type=favoritos  (or 'lendo' or 'lidos')
// Requires Authorization: Bearer <token>
app.get("/library", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);

    const type = (req.query.type as string) ?? "favoritos";
    let tableName = "favorites";
    if (type === "lendo") tableName = "reading";
    else if (type === "lidos") tableName = "read";
    else if (type === "favoritos") tableName = "favorites";

    // Use service_role key to query cross-table (safer)
    const svc = svcClient();

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
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

const resolveTable = (type?: string) => {
  if (type === "lendo") return "reading";
  if (type === "lidos") return "read";
  return "favorites";
};

const getAuthenticatedUserId = async (authHeader: string) => {
  try {
    const user = await getUserFromAuthHeader(authHeader);
    return user.id;
  } catch {
    return null;
  }
};

// POST /library/:type -> adiciona livro na lista do usuário
app.post("/library/:type", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);

    const userId = await getAuthenticatedUserId(authHeader);
    if (!userId) return res.status(401).json({ error: "not authenticated" });

    const tableName = resolveTable(req.params.type);
    const bookId = req.body?.book_id;
    if (!bookId) return res.status(400).json({ error: "book_id is required" });

    const svc = svcClient();
    const { error } = await svc.from(tableName).upsert(
      { user_id: userId, book_id: bookId },
      { onConflict: "user_id,book_id" }
    );

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// DELETE /library/:type/:bookId -> remove livro da lista do usuário
app.delete("/library/:type/:bookId", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);

    const userId = await getAuthenticatedUserId(authHeader);
    if (!userId) return res.status(401).json({ error: "not authenticated" });

    const tableName = resolveTable(req.params.type);
    const bookId = req.params.bookId;
    if (!bookId) return res.status(400).json({ error: "book_id is required" });

    const svc = svcClient();
    const { error } = await svc.from(tableName).delete().eq("user_id", userId).eq("book_id", bookId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// GET /me/admin -> true/false
app.get("/me/admin", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ isAdmin: !!data });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// GET /me/profile
app.get("/me/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ profile: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// PUT /me/profile -> { username?, avatar_image?, banner_image? }
app.put("/me/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const username = typeof req.body?.username === "string" ? req.body.username.trim() : undefined;
    const avatar_image = typeof req.body?.avatar_image === "string" ? req.body.avatar_image : undefined;
    const banner_image = typeof req.body?.banner_image === "string" ? req.body.banner_image : undefined;

    const payload: Record<string, any> = { user_id: user.id };
    if (username !== undefined) payload.username = username;
    if (avatar_image !== undefined) payload.avatar_image = avatar_image;
    if (banner_image !== undefined) payload.banner_image = banner_image;

    const { data, error } = await svc
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ profile: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// GET /me/settings
app.get("/me/settings", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ settings: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// PUT /me/settings -> { theme?, sound_enabled?, notifications_enabled? }
app.put("/me/settings", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const theme = req.body?.theme;
    const sound_enabled = req.body?.sound_enabled;
    const notifications_enabled = req.body?.notifications_enabled;

    const payload: Record<string, any> = { user_id: user.id };
    if (theme === "light" || theme === "dark") payload.theme = theme;
    if (typeof sound_enabled === "boolean") payload.sound_enabled = sound_enabled;
    if (typeof notifications_enabled === "boolean") payload.notifications_enabled = notifications_enabled;

    const { data, error } = await svc
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ settings: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// Reading goals (para Profile)
app.get("/goals", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc
      .from("reading_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ goals: data ?? [] });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

app.post("/goals", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const target_books = Number(req.body?.target_books);
    const deadline = req.body?.deadline ?? null;

    if (!title || !Number.isFinite(target_books) || target_books <= 0) {
      return res.status(400).json({ error: "title and target_books are required" });
    }

    const { data, error } = await svc
      .from("reading_goals")
      .insert({
        user_id: user.id,
        title,
        target_books,
        deadline,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ goal: data });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

app.patch("/goals/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();
    const id = req.params.id;

    const current_books = req.body?.current_books;
    const completed = req.body?.completed;

    const payload: Record<string, any> = {};
    if (Number.isFinite(Number(current_books))) payload.current_books = Number(current_books);
    if (typeof completed === "boolean") payload.completed = completed;

    const { data, error } = await svc
      .from("reading_goals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });
    return res.json({ goal: data });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

app.delete("/goals/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();
    const id = req.params.id;

    const { error } = await svc.from("reading_goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// Reading progress
app.get("/reading-progress/:bookId", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const bookId = req.params.bookId;
    const svc = svcClient();

    const { data, error } = await svc
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ progress: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

app.put("/reading-progress/:bookId", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const bookId = req.params.bookId;
    const svc = svcClient();

    const current_page = Number(req.body?.current_page ?? 1);
    const total_pages = Number(req.body?.total_pages ?? 1);
    const progress_percentage = Number(req.body?.progress_percentage ?? 0);

    const { data, error } = await svc
      .from("reading_progress")
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          current_page,
          total_pages,
          progress_percentage,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,book_id" }
      )
      .select("*")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ progress: data ?? null });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

const PORT = Number(process.env.PORT ?? 4200);
if (NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`library-service listening on ${PORT}`));
}

export default app;
