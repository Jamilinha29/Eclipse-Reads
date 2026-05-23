/**
 * Insere conquistas padrão se a tabela achievements estiver vazia.
 * Uso: node scripts/seed-achievements.mjs
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

const DEFAULT_ACHIEVEMENTS = [
  { title: "Primeira leitura", description: "Abriu o primeiro livro na plataforma." },
  { title: "Maratonista", description: "Leu mais de 100 páginas num único dia." },
  { title: "Bibliófilo", description: "Adicionou 5 livros aos favoritos." },
  { title: "Meta cumprida", description: "Concluiu uma meta de leitura." },
  { title: "Crítico", description: "Publicou a primeira avaliação de um livro." },
  { title: "Explorador", description: "Leu livros de 3 categorias diferentes." },
];

async function main() {
  const { count, error: countErr } = await supabase
    .from("achievements")
    .select("*", { count: "exact", head: true });
  if (countErr) {
    console.error("Erro ao consultar achievements:", countErr.message);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(`achievements já tem ${count} registo(s). Nada a fazer.`);
    return;
  }

  const { data, error } = await supabase.from("achievements").insert(DEFAULT_ACHIEVEMENTS).select("id, title");
  if (error) {
    console.error("Erro ao inserir conquistas:", error.message);
    process.exit(1);
  }

  console.log(`Inseridas ${data.length} conquistas:`);
  data.forEach((row) => console.log(`  - ${row.title} (${row.id})`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
