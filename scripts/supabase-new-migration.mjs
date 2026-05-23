/**
 * Cria um novo arquivo de migração incremental.
 * Uso: npm run db:new -- add_minha_coluna
 */
import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../services/main-service/supabase/migrations");

const rawName = process.argv.slice(2).join("_").trim() || "change";
const slug = rawName
  .toLowerCase()
  .replace(/[^a-z0-9_]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 48);

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const timestamp = [
  now.getUTCFullYear(),
  pad(now.getUTCMonth() + 1),
  pad(now.getUTCDate()),
  pad(now.getUTCHours()),
  pad(now.getUTCMinutes()),
  pad(now.getUTCSeconds()),
].join("");

const filename = `${timestamp}_${slug || "change"}.sql`;
const filepath = resolve(migrationsDir, filename);

if (existsSync(filepath)) {
  console.error("Arquivo já existe:", filepath);
  process.exit(1);
}

const template = `-- Migration: ${slug || "change"}
-- Criada em ${now.toISOString()}
-- Use comandos idempotentes quando possível: IF NOT EXISTS, DROP POLICY IF EXISTS, etc.

-- Exemplo:
-- ALTER TABLE public.user_settings
-- ADD COLUMN IF NOT EXISTS minha_coluna BOOLEAN NOT NULL DEFAULT false;

`;

writeFileSync(filepath, template, "utf8");
console.log("Criado:", filepath);
console.log("\nEdite o SQL, depois: npm run db:push\n");
