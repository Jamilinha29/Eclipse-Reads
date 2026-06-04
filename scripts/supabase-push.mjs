import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

console.log("=== Eclipse Reads — supabase db push ===\n");
console.log("Diretório:", supabaseDir, "\n");

const extraArgs = process.argv.slice(2);
run("npx", ["supabase", "db", "push", ...extraArgs]);

console.log("\n✓ Migrações aplicadas. Rode: npm run audit:supabase\n");
