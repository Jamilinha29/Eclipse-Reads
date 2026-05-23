/**
 * Audita tabelas, colunas, RPC, buckets e contagens esperadas pelo Eclipse Reads.
 * Uso: node scripts/audit-supabase-schema.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../services/backend/envs/books-api.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY em services/backend/envs/books-api.env");
  process.exit(1);
}

const supabase = createClient(url, key);

const REQUIRED_TABLES = [
  "profiles",
  "favorites",
  "reading",
  "read",
  "reading_goals",
  "user_settings",
  "quotes",
  "reading_progress",
  "user_roles",
  "book_submissions",
  "books",
  "reviews",
  "achievements",
  "user_achievements",
];

const REQUIRED_COLUMNS = {
  user_settings: ["new_books_notifications"],
  books: ["age_rating", "file_path", "submission_id"],
  profiles: ["avatar_image", "banner_image"],
};

const REQUIRED_BUCKETS = ["books", "avatars", "mensagem-diaria"];

async function countTable(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  return { count: count ?? 0, error: error?.message };
}

async function checkColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return error?.message ?? null;
}

async function main() {
  console.log("=== Eclipse Reads — auditoria Supabase ===\n");
  console.log("Projeto:", url, "\n");

  const issues = [];
  const ok = [];

  for (const table of REQUIRED_TABLES) {
    const { count, error } = await countTable(table);
    if (error) {
      issues.push(`TABELA AUSENTE ou inacessível: public.${table} — ${error}`);
    } else {
      ok.push(`Tabela ${table}: OK (${count} registos)`);
    }
  }

  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    for (const col of cols) {
      const err = await checkColumn(table, col);
      if (err) issues.push(`COLUNA AUSENTE: public.${table}.${col} — ${err}`);
      else ok.push(`Coluna ${table}.${col}: OK`);
    }
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("has_role", {
    _user_id: "00000000-0000-0000-0000-000000000001",
    _role: "admin",
  });
  if (rpcErr) issues.push(`RPC has_role: FALTA ou erro — ${rpcErr.message}`);
  else ok.push(`RPC has_role: OK (retorno=${rpcData})`);

  for (const bucket of REQUIRED_BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    if (error) issues.push(`BUCKET Storage '${bucket}': ${error.message}`);
    else ok.push(`Bucket '${bucket}': OK`);
  }

  const { count: booksCount } = await countTable("books");
  const { data: livrosList } = await supabase.storage.from("books").list("livros", { limit: 500 });
  const storageFiles = (livrosList ?? []).filter((f) => f.metadata).length;
  if (storageFiles > 0 && booksCount === 0) {
    issues.push(
      `DADOS: ${storageFiles} ficheiro(s) em books/livros/ mas 0 livros importados na tabela books — use Painel Admin → Importar`
    );
  }

  const { count: achievementsCount } = await countTable("achievements");
  if (achievementsCount === 0) {
    issues.push("DADOS: tabela achievements vazia — secção de conquistas no perfil fica vazia (opcional: inserir via admin)");
  }

  const { count: quotesCount } = await countTable("quotes");
  const { data: dailyList } = await supabase.storage.from("mensagem-diaria").list("", { limit: 5 });
  if (quotesCount === 0 && (!dailyList || dailyList.length === 0)) {
    issues.push("DADOS: quotes vazia e bucket mensagem-diaria vazio — /quotes/today pode falhar");
  }

  const { data: admins } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
  if (!admins?.length) {
    issues.push("DADOS: nenhum admin em user_roles — INSERT manual necessário após cadastro");
  } else {
    ok.push(`Admins: ${admins.length} registo(s)`);
  }

  console.log("--- OK ---");
  ok.forEach((line) => console.log("  ✓", line));

  console.log("\n--- PROBLEMAS / AÇÃO NECESSÁRIA ---");
  if (issues.length === 0) {
    console.log("  Nenhum problema estrutural detectado.");
  } else {
    issues.forEach((line) => console.log("  ✗", line));
  }

  console.log("\n--- RESUMO ---");
  console.log(`  ${ok.length} verificações OK, ${issues.length} problema(s)`);
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
