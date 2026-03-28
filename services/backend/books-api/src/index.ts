import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables from the correct .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../envs/books-api.env") });

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "stream";
import multer from "multer";

const app = express();
app.disable("x-powered-by");

// Middleware configuration
app.use(express.json({ limit: '10mb' })); // Limite para uploads de arquivos
app.use(morgan("dev"));
const defaultDevOrigins = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"];
const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// ENV with validation
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const NODE_ENV = process.env.NODE_ENV ?? "development";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_KEY, or SUPABASE_ANON_KEY not set. Exiting...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function rewriteBookUrl(url: string | null | undefined, req: Request): string | null {
  if (!url) return null;
  const marker = "/object/public/books/";
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const pathParams = url.slice(idx + marker.length);
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    return `${protocol}://${host}/images/books/${pathParams}`;
  }
  return url;
}

const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

async function requireUser(req: Request): Promise<{ id: string; email?: string | null }> {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

  const clientWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await clientWithAuth.auth.getUser();
  if (error || !data?.user?.id) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return { id: data.user.id, email: data.user.email };
}

async function requireAdmin(req: Request): Promise<{ id: string }> {
  const user = await requireUser(req);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const roles = (data ?? [])
    .map((row: any) => (typeof row?.role === "string" ? row.role.trim().toLowerCase() : ""))
    .filter(Boolean);
  const isAdmin = roles.includes("admin") || roles.includes("adm");

  if (!isAdmin) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  return user;
}

// Health
const startTime = Date.now();
let requests = 0;

app.get("/health", (_req: Request, res: Response) => {
  return res.json({ status: "ok", uptime_ms: Date.now() - startTime });
});

app.get("/metrics", (_req: Request, res: Response) => {
  return res.json({ requests });
});

// GET /books -> retorna todos os livros (ordenado por created_at desc)
app.get("/books", async (req: Request, res: Response) => {
  requests++;
  try {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, category, cover_image, rating, age_rating, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Database error /books:", error);
      const msg = process.env.NODE_ENV === "test" ? error.message : "Erro ao buscar livros.";
      return res.status(500).json({ error: msg });
    }
    
    const rewrittenBooks = (data ?? []).map((book: any) => ({
      ...book,
      cover_image: rewriteBookUrl(book.cover_image, req),
    }));

    return res.json({ books: rewrittenBooks });
  } catch (err: any) {
    console.error("❌ Unexpected error /books:", err);
    const msg = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro interno ao carregar catálogo.";
    return res.status(500).json({ error: msg });
  }
});

// GET /books/:id -> busca um livro
app.get("/books/:id", async (req: Request, res: Response) => {
  requests++;
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, description, category, cover_image, rating, file_type, created_at, age_rating")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("❌ Database error /books/:id:", error);
      const msg = process.env.NODE_ENV === "test" ? error.message : "Erro ao buscar detalhes do livro.";
      return res.status(500).json({ error: msg });
    }
    
    if (data) {
      data.cover_image = rewriteBookUrl(data.cover_image, req);
    }
    
    return res.json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected error /books/:id:", err);
    const msg = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro ao processar requisição do livro.";
    return res.status(500).json({ error: msg });
  }
});

// GET /books/:id/file -> faz proxy do arquivo do livro pelo backend
app.get("/books/:id/file", async (req: Request, res: Response) => {
  requests++;
  try {
    // Endpoint liberado: iframes e bibliotecas de PDF/Epub do frontend não enviam Header Authorization.
    const id = req.params.id;
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("file_path, file_type, title")
      .eq("id", id)
      .maybeSingle();

    if (bookError) {
      console.error("❌ Database error /books/:id/file:", bookError);
      return res.status(500).json({ error: "Erro ao localizar arquivo do livro." });
    }
    if (!book?.file_path) return res.status(404).json({ error: "Arquivo não encontrado." });

    const { data: fileData, error: fileError } = await supabase.storage
      .from("books")
      .download(book.file_path);

    if (fileError) {
      console.error("❌ Storage error /books/:id/file:", fileError);
      return res.status(500).json({ error: "Erro ao baixar arquivo do livro." });
    }

    const fileType = (book.file_type || "").toLowerCase();
    const contentType =
      fileType === "pdf"
        ? "application/pdf"
        : fileType === "epub"
          ? "application/epub+zip"
          : fileType === "mobi"
            ? "application/x-mobipocket-ebook"
            : "application/octet-stream";

    const extension = fileType || "bin";
    const safeTitle = (book.title || "book").replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.${extension}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "same-origin");

    const arrayBuffer = await fileData.arrayBuffer();
    Readable.from(Buffer.from(arrayBuffer)).pipe(res);
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

// POST /submissions -> cria submissão + upload no bucket books (multipart/form-data)
app.post("/submissions", upload.single("file"), async (req: Request, res: Response) => {
  requests++;
  try {
    const user = await requireUser(req);
    const title = String(req.body?.title ?? "").trim();
    const author = String(req.body?.author ?? "").trim();
    const description = String(req.body?.description ?? "").trim();
    const category = String(req.body?.category ?? "").trim();
    const file = req.file;

    if (!title || !author || !description || !category || !file) {
      return res.status(400).json({ error: "title, author, description, category and file are required" });
    }

    const originalName = file.originalname || "book";
    const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
    const allowedExt = new Set(["pdf", "epub", "mobi"]);
    if (!allowedExt.has(ext)) return res.status(400).json({ error: "Invalid file type" });

    const filePath = `${user.id}/${Date.now()}_${originalName}`.replace(/\s+/g, "_");

    const { error: uploadError } = await supabase.storage
      .from("books")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: submission, error: insertError } = await supabase
      .from("book_submissions")
      .insert({
        user_id: user.id,
        title,
        author,
        description,
        category,
        file_path: filePath,
        file_type: ext,
        status: "pending",
      })
      .select("*")
      .maybeSingle();

    if (insertError) {
      console.error("❌ Database error /submissions insert:", insertError);
      await supabase.storage.from("books").remove([filePath]).catch(() => null);
      return res.status(500).json({ error: "Erro ao salvar dados da submissão." });
    }

    return res.status(201).json({ submission });
  } catch (err: any) {
    console.error("❌ Unexpected error /submissions POST:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro ao processar nova submissão." });
  }
});

// GET /submissions/mine -> lista submissões do usuário
app.get("/submissions/mine", async (req: Request, res: Response) => {
  requests++;
  try {
    const user = await requireUser(req);
    const { data, error } = await supabase
      .from("book_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    return res.json({ submissions: data ?? [] });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

// DELETE /submissions/:id -> remove submissão pendente do usuário + arquivo
app.delete("/submissions/:id", async (req: Request, res: Response) => {
  requests++;
  try {
    const user = await requireUser(req);
    const id = req.params.id;

    const { data: submission, error: loadError } = await supabase
      .from("book_submissions")
      .select("id, user_id, status, file_path")
      .eq("id", id)
      .maybeSingle();

    if (loadError) return res.status(500).json({ error: loadError.message });
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (submission.user_id !== user.id) return res.status(403).json({ error: "Forbidden" });
    if (submission.status !== "pending") return res.status(400).json({ error: "Only pending submissions can be deleted" });

    if (submission.file_path) {
      await supabase.storage.from("books").remove([submission.file_path]).catch(() => null);
    }

    const { error: deleteError } = await supabase.from("book_submissions").delete().eq("id", id);
    if (deleteError) {
      console.error("❌ Database error /submissions DELETE:", deleteError);
      return res.status(500).json({ error: "Falha ao remover submissão." });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected error /submissions DELETE:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro ao processar cancelamento." });
  }
});

// --- Admin (exige Bearer + role admin) ---
app.get("/admin/submissions", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from("book_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    return res.json({ submissions: data ?? [] });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

app.post("/admin/submissions/:id/approve", async (req: Request, res: Response) => {
  requests++;
  try {
    const admin = await requireAdmin(req);
    const id = req.params.id;
    const { data: submission, error: loadErr } = await supabase
      .from("book_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (loadErr) return res.status(500).json({ error: loadErr.message });
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (submission.status !== "pending") return res.status(400).json({ error: "Submission is not pending" });

    const { error: upErr } = await supabase
      .from("book_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq("id", id);
    if (upErr) {
      console.error("❌ Database error /admin/submissions approve status:", upErr);
      return res.status(500).json({ error: "Falha ao atualizar status da submissão." });
    }

    const { error: bookErr } = await supabase.from("books").insert({
      title: submission.title,
      author: submission.author,
      description: submission.description,
      category: submission.category,
      file_path: submission.file_path,
      file_type: submission.file_type,
      submission_id: submission.id,
    });
    if (bookErr) {
      console.error("❌ Database error /admin/submissions approve insert book:", bookErr);
      return res.status(500).json({ error: "Erro ao inserir livro aprovado no catálogo." });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected error /admin/submissions approve:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro ao processar aprovação." });
  }
});

app.post("/admin/submissions/:id/reject", async (req: Request, res: Response) => {
  requests++;
  try {
    const admin = await requireAdmin(req);
    const id = req.params.id;
    const rejection_reason = String(req.body?.rejection_reason ?? "").trim();
    if (!rejection_reason) return res.status(400).json({ error: "rejection_reason is required" });

    const { error } = await supabase
      .from("book_submissions")
      .update({
        status: "rejected",
        rejection_reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq("id", id);
    if (error) {
      console.error("❌ Database error /admin/submissions reject:", error);
      return res.status(500).json({ error: "Erro ao rejeitar submissão." });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected error /admin/submissions reject:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro ao processar rejeição no servidor." });
  }
});

app.get("/admin/storage/books", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const { data, error } = await supabase.storage.from("books").list("", {
      limit: 2000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    const files = (data ?? []).filter(
      (f) =>
        f.name &&
        (f.name.endsWith(".pdf") || f.name.endsWith(".epub") || f.name.endsWith(".mobi"))
    );
    return res.json({ files });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

app.get("/admin/storage/books/download", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const filePath = String(req.query.path ?? "");
    if (!filePath) return res.status(400).json({ error: "path query required" });

    const { data: fileData, error: fileError } = await supabase.storage.from("books").download(filePath);
    if (fileError) return res.status(500).json({ error: fileError.message });

    const name = filePath.split("/").pop() || "download";
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/"/g, "")}"`);
    const arrayBuffer = await fileData.arrayBuffer();
    Readable.from(Buffer.from(arrayBuffer)).pipe(res);
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

app.post("/admin/storage/books/cover", uploadCover.single("file"), async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const file = req.file;
    if (!file || !file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "image file required" });
    }
    const baseName = String(req.body?.basename ?? "cover").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = (file.originalname?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeExt = ext.length > 0 && ext.length <= 5 ? ext : "jpg";
    const filePath = `covers/${baseName}.${safeExt}`;

    const { error: uploadError } = await supabase.storage.from("books").upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: pub } = supabase.storage.from("books").getPublicUrl(filePath);
    return res.json({ publicUrl: rewriteBookUrl(pub.publicUrl, req) });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

app.put("/admin/books/:id", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const id = req.params.id;
    const { title, author, description, category, cover_image, age_rating } = req.body ?? {};
    const payload: Record<string, unknown> = {};
    if (typeof title === "string") payload.title = title;
    if (typeof author === "string") payload.author = author;
    if (typeof description === "string") payload.description = description;
    if (typeof category === "string") payload.category = category;
    if (cover_image === null || typeof cover_image === "string") payload.cover_image = cover_image;
    if (typeof age_rating === "string") payload.age_rating = age_rating;

    const { data, error } = await supabase.from("books").update(payload).eq("id", id).select("*").maybeSingle();
    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    if (!data) return res.status(404).json({ error: "Not found" });
    
    data.cover_image = rewriteBookUrl(data.cover_image, req);
    return res.json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

app.post("/admin/books/import", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const b = req.body ?? {};
    const title = String(b.title ?? "").trim();
    const author = String(b.author ?? "").trim();
    const category = String(b.category ?? "").trim();
    const file_path = String(b.file_path ?? "").trim();
    const file_type = String(b.file_type ?? "pdf").trim().toLowerCase();
    if (!title || !author || !category || !file_path) {
      return res.status(400).json({ error: "title, author, category, file_path are required" });
    }

    const releaseYear = b.release_year ? parseInt(String(b.release_year), 10) : new Date().getFullYear();
    const created_at =
      Number.isFinite(releaseYear) && releaseYear >= 1800 && releaseYear <= 3000
        ? new Date(releaseYear, 0, 1).toISOString()
        : new Date().toISOString();

    const { data, error } = await supabase
      .from("books")
      .insert({
        title,
        author,
        description: typeof b.description === "string" ? b.description : "",
        category,
        cover_image: b.cover_image ?? null,
        file_path,
        file_type,
        age_rating: typeof b.age_rating === "string" ? b.age_rating : "Livre",
        created_at,
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    
    data.cover_image = rewriteBookUrl(data.cover_image, req);
    return res.status(201).json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

/** Bucket no Supabase Storage: mensagens em .txt ou .json { "quote", "author?", "category?" } */
const DAILY_MESSAGES_BUCKET = "mensagem-diaria";

function parseDailyMessageFile(content: string, id: string) {
  const trimmed = content.trim();
  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>;
    if (j && typeof j.quote === "string") {
      return {
        id: String(j.id ?? id),
        quote: j.quote,
        author: typeof j.author === "string" ? j.author : null,
        category: typeof j.category === "string" ? j.category : null,
      };
    }
  } catch {
    /* texto puro */
  }
  return { id, quote: trimmed, author: null, category: null };
}

function dayOfYearIndex(length: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % length;
}

// GET /quotes/today?rotate=1 — mensagens no bucket `mensagem-diaria` ou fallback na tabela quotes
app.get("/quotes/today", async (req: Request, res: Response) => {
  requests++;
  try {
    const rotate =
      req.query.rotate === "1" ||
      req.query.rotate === "true" ||
      req.query.shuffle === "1" ||
      req.query.shuffle === "true";

    const { data: files, error: listErr } = await supabase.storage
      .from(DAILY_MESSAGES_BUCKET)
      .list("", { limit: 500, sortBy: { column: "name", order: "asc" } });

    if (!listErr && files && files.length > 0) {
      const objs = files.filter((f) => f.name && f.name !== ".emptyFolderPlaceholder");
      if (objs.length > 0) {
        const idx = rotate ? Math.floor(Math.random() * objs.length) : dayOfYearIndex(objs.length);
        const fileName = objs[idx].name;
        const { data: blob, error: dlErr } = await supabase.storage.from(DAILY_MESSAGES_BUCKET).download(fileName);
        if (!dlErr && blob) {
          const text = await blob.text();
          return res.json({ quote: parseDailyMessageFile(text, fileName) });
        }
      }
    }

    const { data, error } = await supabase
      .from("quotes")
      .select("id, quote, author, category")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ Database error /quotes/today:", error);
      return res.status(500).json({ error: "Erro interno ao carregar mensagem do dia." });
    }
    if (!data || data.length === 0) return res.json({ quote: null });

    const index = rotate ? Math.floor(Math.random() * data.length) : dayOfYearIndex(data.length);
    return res.json({ quote: data[index] });
  } catch (err: any) {
    console.error("❌ Unexpected error /quotes/today:", err);
    return res.status(500).json({ error: "Erro inesperado ao carregar mensagem." });
  }
});

// Proxy GET /images/books/* (capas)
app.get("/images/books/*", async (req: Request, res: Response) => {
  requests++;
  try {
    let filePath = req.params[0];
    if (!filePath) return res.status(400).json({ error: "caminho da imagem é obrigatório" });

    // Decodifica se houver caracteres como %20
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      // mantém como está se falhar
    }

    const { data: fileData, error: fileError } = await supabase.storage.from("books").download(filePath);
    if (fileError) {
      console.error(`❌ Storage error /images/books (${filePath}):`, fileError);
      // Se não encontrado, 404 é mais apropriado que 500
      const status = fileError.message?.toLowerCase().includes("not found") ? 404 : 500;
      return res.status(status).json({ error: "Imagem da capa não encontrada ou inacessível." });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "same-origin");

    const arrayBuffer = await fileData.arrayBuffer();
    Readable.from(Buffer.from(arrayBuffer)).pipe(res);
  } catch (err: any) {
    console.error("❌ Unexpected error /images/books:", err);
    return res.status(500).json({ error: "Ocorreu um erro inesperado ao processar a imagem." });
  }
});

// Reviews
app.get("/books/:id/reviews", async (req: Request, res: Response) => {
  requests++;
  try {
    const bookId = req.params.id;
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error /books/:id/reviews:", error);
      return res.status(500).json({ error: "Erro técnico ao buscar avaliações." });
    }
    return res.json({ reviews: data ?? [] });
  } catch (err: any) {
    console.error("❌ Unexpected error /books/:id/reviews:", err);
    return res.status(500).json({ error: "Erro inesperado ao carregar avaliações." });
  }
});

app.put("/books/:id/reviews", async (req: Request, res: Response) => {
  requests++;
  try {
    const user = await requireUser(req);
    const bookId = req.params.id;
    const rating = Number(req.body?.rating ?? 0);
    const comment = typeof req.body?.comment === "string" ? req.body.comment : null;

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const { error } = await supabase.from("reviews").upsert(
      {
        user_id: user.id,
        book_id: bookId,
        rating,
        comment,
      },
      { onConflict: "user_id,book_id" }
    );

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: "Erro interno de banco de dados." });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

// POST /books -> cria (exige body { title, author })
app.post("/books", async (req: Request, res: Response) => {
  requests++;
  try {
    const { title, author, description, isbn, pages } = req.body;
    
    // Validação mais robusta
    if (!title?.trim() || !author?.trim()) {
      return res.status(400).json({ 
        error: "title and author are required and cannot be empty" 
      });
    }

    const bookData = { 
      title: title.trim(), 
      author: author.trim(),
      ...(description && { description: description.trim() }),
      ...(isbn && { isbn }),
      ...(pages && { pages: parseInt(pages) })
    };

    const { data, error } = await supabase
      .from("books")
      .insert([bookData])
      .select()
      .single();
      
    if (error) {
      console.error("❌ Database error /books POST:", error);
      const msg = process.env.NODE_ENV === "test" ? "Failed to create book" : "Erro técnico ao salvar livro.";
      return res.status(500).json({ 
        error: msg 
      });
    }
    
    return res.status(201).json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected error POST /books:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado ao salvar o livro." });
  }
});

const PORT = Number(process.env.PORT ?? 4000);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

if (NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`📚 books-api running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🚀 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
