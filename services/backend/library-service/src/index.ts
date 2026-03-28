import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import { Readable } from "stream";

// Carrega as variáveis de ambiente do arquivo library-service.env
dotenv.config({ path: path.join(process.cwd(), '../envs/library-service.env') });

const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

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

const PROFILE_MEDIA_BUCKET = "avatars";
const profileMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

function storageObjectPathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url?.trim()) return null;
  const withoutQuery = url.split("?")[0];
  const marker = `/object/public/${bucket}/`;
  const idx = withoutQuery.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(withoutQuery.slice(idx + marker.length));
  } catch {
    return withoutQuery.slice(idx + marker.length);
  }
}

function rewriteProfileMediaUrl(url: string | null | undefined, req: Request): string | null {
  if (!url) return null;
  const marker = "/object/public/avatars/";
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const pathParams = url.slice(idx + marker.length);
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    return `${protocol}://${host}/images/avatars/${pathParams}`;
  }
  return url;
}

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

    if (idsError) {
      console.error("❌ Database error /library:", idsError);
      const msg = process.env.NODE_ENV === "test" ? idsError.message : "Erro ao buscar dados da biblioteca.";
      return res.status(500).json({ error: msg });
    }

    const ids = (bookIdsData ?? []).map((r: any) => r.book_id).filter(Boolean);
    if (ids.length === 0) return res.json({ books: [] });

    // buscar livros por ids
    const { data: books, error: booksError } = await svc.from("books").select("*").in("id", ids);
    if (booksError) {
      console.error("❌ Database error /library books:", booksError);
      const msg = process.env.NODE_ENV === "test" ? booksError.message : "Erro ao carregar livros.";
      return res.status(500).json({ error: msg });
    }

    return res.json({ books });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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

    // Workaround para "no unique constraint matching ON CONFLICT"
    const { data: existing } = await svc
      .from(tableName)
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (!existing) {
      const { error } = await svc.from(tableName).insert({ user_id: userId, book_id: bookId });
      if (error) {
        console.error("❌ Database error adding to library:", error);
        const msg = process.env.NODE_ENV === "test" ? error.message : "Falha ao adicionar à biblioteca.";
        return res.status(500).json({ error: msg });
      }
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ Database error /me/admin:", error);
      return res.status(500).json({ error: "Erro ao verificar admin." });
    }
    const roles = (data ?? [])
      .map((row: any) => (typeof row?.role === "string" ? row.role.trim().toLowerCase() : ""))
      .filter(Boolean);
    const isAdmin = roles.includes("admin") || roles.includes("adm");
    return res.json({ isAdmin });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro na verificação de admin.";
    return res.status(status).json({ error: errorMessage });
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
    
    if (data) {
      data.avatar_image = rewriteProfileMediaUrl(data.avatar_image, req);
      data.banner_image = rewriteProfileMediaUrl(data.banner_image, req);
    }
    
    return res.json({ profile: data ?? null });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    
    if (data) {
      data.avatar_image = rewriteProfileMediaUrl(data.avatar_image, req);
      data.banner_image = rewriteProfileMediaUrl(data.banner_image, req);
    }
    
    return res.json({ profile: data ?? null });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
  }
});

// POST /me/profile-media — upload avatar/banner no bucket avatars (sem Supabase no browser)
app.post("/me/profile-media", profileMediaUpload.single("file"), async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const file = req.file;
    const kind = req.body?.kind === "banner" ? "banner" : "avatar";
    if (!file || !file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "image file required" });
    }

    const svc = svcClient();
    const objectPath = `${user.id}/${kind}`;

    const { data: profile, error: pErr } = await svc
      .from("profiles")
      .select("username, avatar_image, banner_image")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr) {
      console.error("❌ Database error /profile-media:", pErr);
      return res.status(500).json({ error: "Erro ao processar mídia do perfil." });
    }

    const previousUrl = kind === "avatar" ? profile?.avatar_image : profile?.banner_image;
    const oldPath = storageObjectPathFromPublicUrl(previousUrl, PROFILE_MEDIA_BUCKET);
    if (oldPath && oldPath !== objectPath) {
      await svc.storage.from(PROFILE_MEDIA_BUCKET).remove([oldPath]).catch(() => null);
    }

    const { error: upErr } = await svc.storage.from(PROFILE_MEDIA_BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: "0",
    });
    if (upErr) {
      console.error("❌ Storage error /profile-media upload:", upErr);
      return res.status(500).json({ error: "Erro no upload da imagem." });
    }

    const { data: pub } = svc.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;

    const fallbackName = user.email?.split("@")[0]?.trim() || "Usuário";
    const username =
      typeof profile?.username === "string" && profile.username.trim() ? profile.username.trim() : fallbackName;

    const upsertRow: Record<string, unknown> = {
      user_id: user.id,
      username,
      avatar_image: kind === "avatar" ? publicUrl : profile?.avatar_image ?? null,
      banner_image: kind === "banner" ? publicUrl : profile?.banner_image ?? null,
    };

    const { data: saved, error: saveErr } = await svc
      .from("profiles")
      .upsert(upsertRow, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    if (saveErr) {
      console.error("❌ Database error /profile-media save:", saveErr);
      return res.status(500).json({ error: "Erro ao salvar referência da imagem." });
    }
    
    if (saved) {
      saved.avatar_image = rewriteProfileMediaUrl(saved.avatar_image, req);
      saved.banner_image = rewriteProfileMediaUrl(saved.banner_image, req);
    }

    return res.json({ publicUrl: rewriteProfileMediaUrl(publicUrl, req), profile: saved });
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
  }
});

// GET /me/settings
app.get("/me/settings", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("❌ Database error /me/settings GET:", error);
      return res.status(500).json({ error: "Erro ao carregar preferências." });
    }
    return res.json({ settings: data ?? null });
  } catch (err: any) {
    console.error("❌ Unexpected error /me/settings GET:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro no serviço de configurações." });
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
    const new_books_notifications = req.body?.new_books_notifications;

    const payload: Record<string, any> = { user_id: user.id };
    if (theme === "light" || theme === "dark") payload.theme = theme;
    if (typeof sound_enabled === "boolean") payload.sound_enabled = sound_enabled;
    if (typeof notifications_enabled === "boolean") payload.notifications_enabled = notifications_enabled;
    if (typeof new_books_notifications === "boolean") payload.new_books_notifications = new_books_notifications;

    const { data, error } = await svc
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("❌ Database error /me/settings PUT:", error);
      const isColumnErr = error.message?.includes("column") || error.message?.includes("not found");
      return res.status(500).json({ 
        error: isColumnErr 
          ? "Erro de banco: coluna 'new_books_notifications' não encontrada. Verifique o SQL de migração." 
          : "Falha ao salvar configurações." 
      });
    }
    return res.json({ settings: data ?? null });
  } catch (err: any) {
    console.error("❌ Unexpected error /me/settings PUT:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro interno ao salvar preferências." });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
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
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
  }
});

// Proxy GET /images/avatars/*
app.get("/images/avatars/*", async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return res.status(400).json({ error: "path is required" });

    const svc = svcClient();
    const { data: fileData, error: fileError } = await svc.storage.from(PROFILE_MEDIA_BUCKET).download(filePath);
    if (fileError) {
      console.error("❌ Storage error /images download:", fileError);
      return res.status(500).json({ error: "Erro ao baixar imagem." });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "same-origin");

    const arrayBuffer = await fileData.arrayBuffer();
    Readable.from(Buffer.from(arrayBuffer)).pipe(res);
  } catch (err: any) {
    console.error("❌ Unexpected error /library:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const errorMessage = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro inesperado na biblioteca.";
    return res.status(status).json({ error: errorMessage });
  }
});

// ACHIEVEMENTS
app.get("/achievements", async (req: Request, res: Response) => {
  try {
    const svc = svcClient();
    const { data, error } = await svc.from("achievements").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Database error /achievements:", error);
      return res.status(500).json({ error: "Erro ao buscar conquistas." });
    }
    return res.json({ achievements: data ?? [] });
  } catch (err) {
    console.error("❌ Unexpected error /achievements:", err);
    return res.status(500).json({ error: "Erro interno ao listar conquistas." });
  }
});

app.post("/me/achievements/:id/toggle", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const achievementId = req.params.id;
    const svc = svcClient();

    const { data: existing } = await svc
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .eq("achievement_id", achievementId)
      .maybeSingle();

    if (existing) {
      await svc.from("user_achievements").delete().eq("user_id", user.id).eq("achievement_id", achievementId);
      return res.json({ achieved: false });
    } else {
      await svc.from("user_achievements").insert({ user_id: user.id, achievement_id: achievementId });
      return res.json({ achieved: true });
    }
  } catch (err: any) {
    console.error("❌ Unexpected error /me/achievements/toggle:", err);
    return res.status(500).json({ error: "Erro ao atualizar conquista." });
  }
});

app.post("/admin/achievements", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some(r => ["admin", "adm"].includes(r.role?.toLowerCase()));
    if (!isAdmin) return res.status(403).json({ error: "Privilégios de admin necessários." });

    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Título é obrigatório." });

    const { data, error } = await svc.from("achievements").insert({ title, description }).select("*").single();
    if (error) {
       console.error("❌ Database error /admin/achievements:", error);
       return res.status(500).json({ error: "Erro ao criar conquista." });
    }
    return res.status(201).json({ achievement: data });
  } catch (err) {
    console.error("❌ Unexpected error /admin/achievements:", err);
    return res.status(500).json({ error: "Erro interno de admin." });
  }
});

app.get("/me/stats", async (req: Request, res: Response) => {
  try {
    const authHeader = requireAuthHeader(req);
    const user = await getUserFromAuthHeader(authHeader);
    const svc = svcClient();

    const { data, error } = await svc.from("reading_progress").select("current_page").eq("user_id", user.id);
    if (error) {
       console.error("❌ Database error /me/stats:", error);
       return res.status(500).json({ error: "Erro ao calcular estatísticas." });
    }
    const totalPagesRead = (data ?? []).reduce((acc, curr) => acc + (Number(curr.current_page) || 0), 0);

    return res.json({ totalPagesRead });
  } catch (err) {
    console.error("❌ Unexpected error /me/stats:", err);
    return res.status(500).json({ error: "Erro interno de estatísticas." });
  }
});

// Middleware de tratamento de erro do Multer (deve ficar após todas as rotas)
app.use((err: any, _req: Request, res: Response, next: any) => {
  if (err && err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "O arquivo é muito grande. O limite máximo é 25MB." });
    }
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  next(err);
});

const PORT = Number(process.env.PORT ?? 4200);
if (NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`library-service listening on ${PORT}`));
}

export default app;
