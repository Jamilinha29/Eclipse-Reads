import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

// Load environment variables from the correct .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../envs/books-api.env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

import express, { NextFunction, Request, Response, type RequestHandler } from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { Readable } from "stream";
import multer from "multer";
import { createHmac, timingSafeEqual } from "crypto";
import { DEFAULT_BOOKS_SUBMISSION_MAX_BYTES, validateBookFileBytes } from "@eclipse-reads/shared";

const app = express();
app.disable("x-powered-by");

const NODE_ENV = process.env.NODE_ENV ?? "development";

function parseAllowedOrigins(fallback: string[]): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return fallback;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function safeDbError(error: { message?: string } | null | undefined, fallback: string): string {
  if (NODE_ENV === "test" && error?.message) return error.message;
  return fallback;
}

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://eclipse-reads.vercel.app",
];
const allowedOrigins = parseAllowedOrigins(defaultOrigins);

// Middleware configuration
app.use(express.json({ limit: "10mb" }));
if (NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: function(origin, callback) {
      // Permite requisições sem origem (como ferramentas no backend) ou origens na lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado pela política de CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-File-Access"],
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

// Middleware para lidar com o prefixo da Vercel
app.use((req, res, next) => {
  if (NODE_ENV !== "production") {
    console.log(`[Vercel Proxy] Books API Hit: ${req.url}`);
  }
  if (req.url.startsWith('/api/books')) {
    req.url = req.url.slice('/api/books'.length);
  }
  if (!req.url.startsWith('/')) req.url = '/' + req.url;
  next();
});

// ENV with validation
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_KEY, or SUPABASE_ANON_KEY not set. Exiting...");
  process.exit(1);
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Limite POST /submissions — override em testes com `BOOKS_SUBMISSION_MAX_BYTES` (bytes). */
const BOOKS_SUBMISSION_MAX_BYTES = parsePositiveIntEnv("BOOKS_SUBMISSION_MAX_BYTES", DEFAULT_BOOKS_SUBMISSION_MAX_BYTES);

/** Node 20 (Docker): Realtime exige `ws` como transport explícito. */
const supabaseWsOptions = { realtime: { transport: ws } } as NonNullable<Parameters<typeof createClient>[2]>;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, supabaseWsOptions);

const AGE_RATINGS = new Set(["Livre", "10+", "12+", "14+", "16+", "18+"]);

async function recomputeBookRating(bookId: string) {
  const { data: rows, error } = await supabase.from("reviews").select("rating").eq("book_id", bookId);
  if (error) return;
  const ratings = (rows ?? []).map((r: { rating: number }) => Number(r.rating)).filter((n) => Number.isFinite(n));
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  await supabase.from("books").update({ rating: Math.round(avg * 100) / 100 }).eq("id", bookId);
}

const FILE_ACCESS_SECRET =
  process.env.FILE_ACCESS_SECRET ??
  (NODE_ENV === "production" ? "" : SUPABASE_SERVICE_KEY.slice(0, 32));
if (!FILE_ACCESS_SECRET) {
  console.error("❌ FILE_ACCESS_SECRET é obrigatório em produção.");
  process.exit(1);
}
const FILE_ACCESS_TTL_SEC = 3600;
/** PDF/EPUB/MOBI ficam em `livros/`; capas continuam em `covers/`. */
const BOOKS_FILES_DIR = "livros";
const BOOK_FILE_EXTENSIONS = new Set(["pdf", "epub", "mobi"]);

function isBookFileName(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return BOOK_FILE_EXTENSIONS.has(base.slice(dot + 1).toLowerCase());
}

function bookContentTypeForExt(ext: string, fallback?: string): string {
  switch (ext.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "epub":
      return "application/epub+zip";
    case "mobi":
      return "application/x-mobipocket-ebook";
    default:
      return fallback || "application/octet-stream";
  }
}

function isStoragePathMissingError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("not found") || m.includes("does not exist") || m.includes("nosuchkey");
}

/** Supabase Storage só aceita ASCII seguro — sem acentos (é, ã, ç). */
function sanitizeStorageFileName(name: string): string {
  const trimmed = name.trim().replace(/\\/g, "/");
  const slash = trimmed.lastIndexOf("/");
  const fileName = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const baseRaw = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const base = baseRaw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "") || "arquivo";
  return ext ? `${base}.${ext}` : base;
}

async function assertBookFileInStorage(filePath: string): Promise<string | null> {
  const { error } = await supabase.storage.from("books").download(filePath);
  if (!error) return null;
  if (isStoragePathMissingError(error.message)) {
    return `Arquivo não encontrado no Storage (${filePath}). Envie o ficheiro para books/livros/ antes de importar.`;
  }
  return error.message;
}

async function listLivrosBookFiles(): Promise<{ name: string; id: string; metadata: Record<string, unknown> | null }[]> {
  async function listRecursive(prefix: string): Promise<{ name: string; id: string; metadata: Record<string, unknown> | null }[]> {
    const { data, error } = await supabase.storage.from("books").list(prefix, {
      limit: 2000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      if (isStoragePathMissingError(error.message)) return [];
      throw error;
    }

    const files: { name: string; id: string; metadata: Record<string, unknown> | null }[] = [];
    for (const item of data ?? []) {
      if (!item.name) continue;
      const path = `${prefix}/${item.name}`;
      const isFolder = item.id == null && item.metadata == null;
      if (isFolder) {
        files.push(...(await listRecursive(path)));
        continue;
      }
      if (isBookFileName(item.name)) {
        files.push({
          name: path,
          id: item.id ?? path,
          metadata: (item.metadata as Record<string, unknown> | undefined) ?? null,
        });
      }
    }
    return files;
  }

  return listRecursive(BOOKS_FILES_DIR);
}

function sanitizeStoragePath(raw: string): string | null {
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/")) return null;
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.some((s) => s === "." || s === "..")) return null;
  return segments.join("/");
}

function isCoverStoragePath(path: string): boolean {
  return path.startsWith("covers/");
}

/** Catálogo público: não expõe caminho interno do Storage (evita download direto). */
function toPublicBook(book: Record<string, unknown>, req: Request) {
  const { file_path: _fp, ...rest } = book;
  return {
    ...rest,
    cover_image: rewriteBookUrl(typeof book.cover_image === "string" ? book.cover_image : null, req),
  };
}

/** Normaliza caminho de arquivo de livro para `livros/...` (ignora capas). */
function normalizeBookFilePath(raw: string): string | null {
  const path = sanitizeStoragePath(raw);
  if (!path || path.startsWith("covers/")) return null;
  if (path.startsWith(`${BOOKS_FILES_DIR}/`)) return path;
  return `${BOOKS_FILES_DIR}/${path}`;
}

function signFileAccessToken(bookId: string): string {
  const exp = Math.floor(Date.now() / 1000) + FILE_ACCESS_TTL_SEC;
  const payload = `${bookId}:${exp}`;
  const sig = createHmac("sha256", FILE_ACCESS_SECRET).update(payload).digest("base64url");
  return `${exp}.${sig}`;
}

function verifyFileAccessToken(bookId: string, token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", FILE_ACCESS_SECRET).update(`${bookId}:${exp}`).digest("base64url");
  try {
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractFileAccessToken(req: Request): string {
  const header = req.headers["x-file-access"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return String(req.query.access ?? "");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BOOKS_SUBMISSION_MAX_BYTES },
});

function rewriteBookUrl(url: string | null | undefined, req: Request): string | null {
  if (!url) return null;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");

  // URL pública padrão do Supabase Storage
  const storageMarker = "/object/public/books/";
  const storageIdx = url.indexOf(storageMarker);
  if (storageIdx !== -1) {
    const pathParams = url.slice(storageIdx + storageMarker.length);
    return `${protocol}://${host}/images/books/${pathParams}`;
  }

  // URLs antigas já proxied (ex.: localhost/images/books/...) devem ser reescritas para o host atual
  const proxyMarker = "/images/books/";
  const proxyIdx = url.indexOf(proxyMarker);
  if (proxyIdx !== -1) {
    const pathParams = url.slice(proxyIdx + proxyMarker.length);
    return `${protocol}://${host}/images/books/${pathParams}`;
  }

  return url;
}

const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function validateBookFileBuffer(buffer: Buffer, ext: string): boolean {
  return validateBookFileBytes(new Uint8Array(buffer), ext);
}

async function requireUser(req: Request): Promise<{ id: string; email?: string | null }> {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

  const clientWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...supabaseWsOptions,
  });

  const { data, error } = await clientWithAuth.auth.getUser();
  if (error || !data?.user?.id) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return { id: data.user.id, email: data.user.email };
}

function rolesFromUserRolesRows(rows: unknown[]): string[] {
  return (rows ?? [])
    .map((row: any) => {
      const r = row?.role;
      if (r == null) return "";
      return String(r).trim().toLowerCase();
    })
    .filter(Boolean);
}

async function requireAdmin(req: Request): Promise<{ id: string }> {
  const user = await requireUser(req);

  const { data: rpcHasAdmin, error: rpcError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (!rpcError && typeof rpcHasAdmin === "boolean") {
    if (!rpcHasAdmin) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    return user;
  }
  if (rpcError) {
    console.warn("⚠️ requireAdmin has_role RPC fallback:", rpcError.message);
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const roles = rolesFromUserRolesRows(data ?? []);
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

app.get("/metrics", async (req: Request, res: Response) => {
  try {
    await requireAdmin(req);
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 401;
    return res.status(status).json({ error: "Unauthorized" });
  }
  return res.json({ requests });
});

// GET /books -> catálogo público: apenas livros realmente importados (com arquivo vinculado)
app.get("/books", async (req: Request, res: Response) => {
  requests++;
  try {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, category, cover_image, rating, age_rating, created_at, file_path")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Database error /books:", error);
      const msg = process.env.NODE_ENV === "test" ? error.message : "Erro ao buscar livros.";
      return res.status(500).json({ error: msg });
    }
    
    const importedBooks = (data ?? []).filter((book: any) => {
      const filePath = typeof book?.file_path === "string" ? book.file_path.trim() : "";
      return filePath.length > 0;
    });

    const rewrittenBooks = importedBooks.map((book: any) => toPublicBook(book, req));

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
      .select("id, title, author, description, category, cover_image, rating, file_type, file_path, created_at, age_rating")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("❌ Database error /books/:id:", error);
      const msg = process.env.NODE_ENV === "test" ? error.message : "Erro ao buscar detalhes do livro.";
      return res.status(500).json({ error: msg });
    }

    const filePath = typeof data?.file_path === "string" ? data.file_path.trim() : "";
    if (!data || !filePath) {
      return res.status(404).json({ error: "Livro não encontrado." });
    }
    
    return res.json({ book: toPublicBook(data as Record<string, unknown>, req) });
  } catch (err: any) {
    console.error("❌ Unexpected error /books/:id:", err);
    const msg = process.env.NODE_ENV === "test" ? (err.message || String(err)) : "Erro ao processar requisição do livro.";
    return res.status(500).json({ error: msg });
  }
});

// GET /books/:id/file-access -> token assinado para leitura in-app (requer login)
app.get("/books/:id/file-access", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireUser(req);
    const id = req.params.id;
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, file_path")
      .eq("id", id)
      .maybeSingle();
    if (bookError) return res.status(500).json({ error: "Erro ao localizar livro." });
    if (!book?.file_path) return res.status(404).json({ error: "Livro não encontrado." });

    const access = signFileAccessToken(id);
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const url = `${protocol}://${host}/books/${id}/file`;
    return res.json({ url, access, expiresIn: FILE_ACCESS_TTL_SEC });
  } catch (err: any) {
    console.error("❌ Unexpected error /books/:id/file-access:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    const msg =
      status === 401
        ? "Faça login para ler este livro."
        : status === 403
          ? "Sem permissão para acessar este livro."
          : "Erro ao gerar acesso ao arquivo.";
    return res.status(status).json({ error: msg });
  }
});

// GET /books/:id/file -> proxy do arquivo (exige token X-File-Access ou ?access= legado)
app.get("/books/:id/file", async (req: Request, res: Response) => {
  requests++;
  try {
    const id = req.params.id;
    const accessToken = extractFileAccessToken(req);
    if (!accessToken || !verifyFileAccessToken(id, accessToken)) {
      return res.status(401).json({ error: "Acesso ao arquivo negado ou token expirado." });
    }
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

    const storagePath = normalizeBookFilePath(book.file_path) ?? book.file_path;
    const { data: fileData, error: fileError } = await supabase.storage
      .from("books")
      .download(storagePath);

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

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
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
app.post("/submissions", upload.single("file") as unknown as RequestHandler, async (req: Request, res: Response) => {
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
    if (!validateBookFileBuffer(file.buffer, ext)) {
      return res.status(400).json({ error: "File content does not match the declared type" });
    }

    const safeName = sanitizeStorageFileName(originalName);
    const filePath = `${BOOKS_FILES_DIR}/${user.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("books")
      .upload(filePath, file.buffer, {
        contentType: bookContentTypeForExt(ext, file.mimetype),
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("❌ Storage error /submissions upload:", uploadError);
      const msg = uploadError.message?.includes("mime")
        ? `${uploadError.message} — tipos aceites: PDF, EPUB, MOBI (máx. 50MB).`
        : uploadError.message;
      return res.status(500).json({ error: msg });
    }

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
app.get("/admin/books", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, description, category, cover_image, rating, age_rating, created_at, file_path, file_type")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Database error /admin/books:", error);
      return res.status(500).json({ error: "Erro ao buscar livros." });
    }
    const imported = (data ?? []).filter((book: any) => {
      const fp = typeof book?.file_path === "string" ? book.file_path.trim() : "";
      return fp.length > 0;
    });
    const books = imported.map((book: any) => ({
      ...book,
      cover_image: rewriteBookUrl(book.cover_image, req),
    }));
    return res.json({ books });
  } catch (err: any) {
    console.error("❌ Unexpected error /admin/books:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Erro ao listar livros para admin." });
  }
});

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
    if (loadErr) return res.status(500).json({ error: safeDbError(loadErr, "Erro ao carregar submissão.") });
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (submission.status !== "pending") return res.status(400).json({ error: "Submission is not pending" });

    const storageErr = await assertBookFileInStorage(submission.file_path);
    if (storageErr) {
      return res.status(400).json({ error: storageErr });
    }

    const { data: existingBook } = await supabase
      .from("books")
      .select("id")
      .eq("submission_id", submission.id)
      .maybeSingle();
    if (existingBook) {
      return res.status(409).json({ error: "Submission already approved into catalog." });
    }

    const { data: rpcResult, error: rpcErr } = await supabase.rpc("approve_book_submission", {
      p_submission_id: id,
      p_reviewer_id: admin.id,
    });
    if (rpcErr) {
      const msg = rpcErr.message ?? "";
      console.error("❌ RPC approve_book_submission:", rpcErr);
      if (msg.includes("submission_not_found")) return res.status(404).json({ error: "Not found" });
      if (msg.includes("submission_not_pending")) return res.status(400).json({ error: "Submission is not pending" });
      if (msg.includes("already_approved")) {
        return res.status(409).json({ error: "Submission already approved into catalog." });
      }
      return res.status(500).json({ error: safeDbError(rpcErr, "Erro ao aprovar submissão.") });
    }
    return res.json({ ok: true, book_id: (rpcResult as { book_id?: string })?.book_id });
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

    const { data: submission, error: loadErr } = await supabase
      .from("book_submissions")
      .select("id, status, file_path")
      .eq("id", id)
      .maybeSingle();
    if (loadErr) return res.status(500).json({ error: safeDbError(loadErr, "Erro ao carregar submissão.") });
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (submission.status !== "pending") return res.status(400).json({ error: "Submission is not pending" });

    const { error } = await supabase
      .from("book_submissions")
      .update({
        status: "rejected",
        rejection_reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      console.error("❌ Database error /admin/submissions reject:", error);
      return res.status(500).json({ error: safeDbError(error, "Erro ao rejeitar submissão.") });
    }
    if (submission.file_path) {
      await supabase.storage.from("books").remove([submission.file_path]).catch(() => null);
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
    const files = await listLivrosBookFiles();
    return res.json({ files });
  } catch (err: any) {
    console.error("❌ Storage error /admin/storage/books:", err);
    const msg =
      err?.message && typeof err.message === "string"
        ? err.message
        : "Erro ao listar arquivos em books/livros/.";
    return res.status(500).json({ error: msg });
  }
});

app.get("/admin/storage/books/download", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const filePath = sanitizeStoragePath(String(req.query.path ?? ""));
    if (!filePath) return res.status(400).json({ error: "path query required or invalid" });

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

app.post("/admin/storage/books/cover", uploadCover.single("file") as unknown as RequestHandler, async (req: Request, res: Response) => {
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
    if (typeof age_rating === "string") {
      if (!AGE_RATINGS.has(age_rating)) {
        return res.status(400).json({ error: "age_rating inválido." });
      }
      payload.age_rating = age_rating;
    }

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
    const file_path = normalizeBookFilePath(String(b.file_path ?? ""));
    const file_type = String(b.file_type ?? "pdf").trim().toLowerCase();
    if (!title || !author || !category || !file_path) {
      return res.status(400).json({ error: "title, author, category, file_path are required" });
    }

    const storageErr = await assertBookFileInStorage(file_path);
    if (storageErr) {
      return res.status(400).json({ error: storageErr });
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
      console.error("❌ Database error /admin/books/import:", error);
      return res.status(500).json({
        error: error.message || "Erro ao gravar livro na tabela books.",
      });
    }

    data.cover_image = rewriteBookUrl(data.cover_image, req);
    return res.status(201).json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected server error /admin/books/import:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

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

// Proxy GET /images/books/* — apenas capas (covers/); livros só via /books/:id/file com token
app.get("/images/books/*", async (req: Request, res: Response) => {
  requests++;
  try {
    let rawPath = req.params[0];
    if (!rawPath) return res.status(400).json({ error: "caminho da imagem é obrigatório" });

    try {
      rawPath = decodeURIComponent(rawPath);
    } catch {
    
    }
    const filePath = sanitizeStoragePath(rawPath);
    if (!filePath) return res.status(400).json({ error: "caminho da imagem inválido" });
    if (!isCoverStoragePath(filePath)) {
      return res.status(403).json({ error: "Download de livros não permitido por esta rota." });
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

    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id).filter(Boolean)));
    let nameByUser: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      nameByUser = Object.fromEntries(
        (profiles ?? []).map((p: { user_id: string; username: string }) => [p.user_id, p.username])
      );
    }

    const reviews = rows.map((r: { id: string; rating: number; comment: string | null; created_at: string; user_id: string }) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      author_name: nameByUser[r.user_id] || "Leitor",
    }));

    return res.json({ reviews });
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

    const trimmedComment =
      typeof comment === "string" ? comment.trim().slice(0, 2000) : null;

    const { data: bookRow, error: bookErr } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .maybeSingle();
    if (bookErr) {
      return res.status(500).json({ error: safeDbError(bookErr, "Erro ao validar livro.") });
    }
    if (!bookRow) return res.status(404).json({ error: "Livro não encontrado." });

    const { error } = await supabase.from("reviews").upsert(
      {
        user_id: user.id,
        book_id: bookId,
        rating,
        comment: trimmedComment,
      },
      { onConflict: "user_id,book_id" }
    );

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({ error: safeDbError(error, "Erro interno de banco de dados.") });
    }
    await recomputeBookRating(bookId);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado no servidor." });
  }
});

// POST /books -> admin only; alinhado ao schema (use /admin/books/import para catálogo completo)
app.post("/books", async (req: Request, res: Response) => {
  requests++;
  try {
    await requireAdmin(req);
    const title = String(req.body?.title ?? "").trim();
    const author = String(req.body?.author ?? "").trim();
    const category = String(req.body?.category ?? "").trim();
    const file_path = normalizeBookFilePath(String(req.body?.file_path ?? ""));
    const file_type = String(req.body?.file_type ?? "pdf").trim().toLowerCase();
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";

    if (!title || !author || !category || !file_path) {
      return res.status(400).json({
        error: "title, author, category and file_path are required",
      });
    }

    const storageErr = await assertBookFileInStorage(file_path);
    if (storageErr) {
      return res.status(400).json({ error: storageErr });
    }

    const { data, error } = await supabase
      .from("books")
      .insert({
        title,
        author,
        description,
        category,
        file_path,
        file_type,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Database error /books POST:", error);
      const msg = process.env.NODE_ENV === "test" ? "Failed to create book" : "Erro técnico ao salvar livro.";
      return res.status(500).json({ error: msg });
    }

    return res.status(201).json({ book: data });
  } catch (err: any) {
    console.error("❌ Unexpected error POST /books:", err);
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: "Ocorreu um erro inesperado ao salvar o livro." });
  }
});

// Multer (tamanho de ficheiro) — após as rotas que usam upload
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const e = err as { name?: string; code?: string; message?: string };
  if (e?.name === "MulterError") {
    if (e.code === "LIMIT_FILE_SIZE") {
      const mb = Math.max(1, Math.round(BOOKS_SUBMISSION_MAX_BYTES / (1024 * 1024)));
      return res.status(413).json({ error: `File too large (max ${mb}MB).` });
    }
    return res.status(400).json({ error: `Upload error: ${e.message ?? "unknown"}` });
  }
  next(err);
});

const PORT = Number(process.env.PORT ?? 4000);

let server: ReturnType<typeof app.listen> | undefined;

function shutdown(signal: string) {
  console.log(`📴 ${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

if (NODE_ENV !== "test" && !process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`📚 books-api running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
  });
}

app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (!res.headersSent) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default app;
