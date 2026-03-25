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
const NODE_ENV = process.env.NODE_ENV ?? "development";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Exiting...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    const arrayBuffer = await fileData.arrayBuffer();
    Readable.from(Buffer.from(arrayBuffer)).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) });
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
