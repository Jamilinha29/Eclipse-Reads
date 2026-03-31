import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const testsDir = path.join(rootDir, "tests");

async function listTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listTestFiles(fullPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

const allTestFiles = (await listTestFiles(testsDir))
  .sort((a, b) => a.localeCompare(b))
  .map((absolutePath) => path.relative(rootDir, absolutePath).replaceAll("\\", "/"));

if (allTestFiles.length === 0) {
  console.log("Nenhum arquivo .test.ts encontrado em tests/");
  process.exit(0);
}

for (const [index, testFile] of allTestFiles.entries()) {
  console.log(`\n[${index + 1}/${allTestFiles.length}] Executando ${testFile}`);
  const result = spawnSync("npx", ["vitest", "run", testFile], {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nTodos os ${allTestFiles.length} testes foram executados com sucesso (um por vez).`);

