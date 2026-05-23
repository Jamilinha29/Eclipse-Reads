/**
 * Marca a migração baseline como já aplicada (sem executar SQL).
 * Use UMA VEZ quando o schema completo já foi colado manualmente no Supabase.
 */
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const BASELINE_VERSION = "20260525180000";

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseDir = resolve(__dirname, "../services/main-service");

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: supabaseDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("=== Eclipse Reads — marcar baseline no Supabase ===\n");
console.log(`Versão: ${BASELINE_VERSION}`);
console.log("Isso NÃO executa SQL — só registra que o combined já foi aplicado.\n");
console.log("Requer: npx supabase login + supabase link no diretório main-service\n");

run("npx", ["supabase", "migration", "repair", BASELINE_VERSION, "--status", "applied"]);

console.log("\n✓ Baseline registrada. Próximas alterações: npm run db:new → editar SQL → npm run db:push\n");
