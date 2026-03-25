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

// Middleware configuration
app.use(express.json({ limit: '10mb' })); // Limite para uploads de arquivos
app.use(morgan("dev"));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seu-dominio.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'], // Vite e Create React App
  credentials: true
}));

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
app.get("/books", async (_req: Request, res: Response) => {
  requests++;
  try {
    const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ books: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /books/:id -> busca um livro
app.get("/books/:id", async (req: Request, res: Response) => {
  requests++;
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ book: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /books/:id/file -> faz proxy do arquivo do livro pelo backend
app.get("/books/:id/file", async (req: Request, res: Response) => {
  requests++;
  try {
    // Exige sessão válida (não expõe Supabase no navegador)
    await requireUser(req);

    const id = req.params.id;
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("file_path, file_type, title")
      .eq("id", id)
      .maybeSingle();

    if (bookError) return res.status(500).json({ error: bookError.message });
    if (!book?.file_path) return res.status(404).json({ error: "Book file not found" });

    const { data: fileData, error: fileError } = await supabase.storage
      .from("books")
      .download(book.file_path);

    if (fileError) return res.status(500).json({ error: fileError.message });

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
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
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
      await supabase.storage.from("books").remove([filePath]).catch(() => null);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ submission });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
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

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ submissions: data ?? [] });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
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
    if (deleteError) return res.status(500).json({ error: deleteError.message });

    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
  }
});

// GET /quotes/today -> retorna frase fixa do dia
app.get("/quotes/today", async (_req: Request, res: Response) => {
  requests++;
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, quote, author, category")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.json({ quote: null });

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % data.length;

    return res.json({ quote: data[index] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
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

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ reviews: data ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
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

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode ? Number(err.statusCode) : 500;
    return res.status(status).json({ error: err.message ?? String(err) });
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
      console.error("Database error:", error);
      return res.status(500).json({ error: "Failed to create book" });
    }
    
    return res.status(201).json({ book: data });
  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
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
