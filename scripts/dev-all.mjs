import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const services = [
  {
    name: "frontend",
    url: "http://localhost:8080/",
    cwd: path.join(rootDir, "frontend"),
    cmd: "npm",
    args: ["run", "dev"],
  },
  {
    name: "books-api",
    url: "http://localhost:4000/health",
    cwd: path.join(rootDir, "services", "backend", "books-api"),
    cmd: "npm",
    args: ["run", "dev"],
  },
  {
    name: "auth-proxy",
    url: "http://localhost:4100/health",
    cwd: path.join(rootDir, "services", "backend", "auth-proxy"),
    cmd: "npm",
    args: ["run", "dev"],
  },
  {
    name: "library-service",
    url: "http://localhost:4200/health",
    cwd: path.join(rootDir, "services", "backend", "library-service"),
    cmd: "npm",
    args: ["run", "dev"],
  },
];

async function isUp(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return !!res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const started = [];

  // Evita iniciar tudo ao mesmo tempo (reduz corrida de portas).
  for (const s of services) {
    const up = await isUp(s.url);
    if (up) {
      console.log(`[dev:all] ${s.name} already running (${s.url})`);
      continue;
    }

    console.log(`[dev:all] Starting ${s.name}...`);
    const child = spawn(s.cmd, s.args, {
      cwd: s.cwd,
      shell: true,
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
    started.push(s.name);
  }

  if (started.length === 0) {
    console.log("[dev:all] Nothing to start. All services look healthy.");
  } else {
    console.log(`[dev:all] Started: ${started.join(", ")}.`);
    console.log("[dev:all] Aguarde alguns segundos e recarregue o frontend.");
  }
}

main().catch((err) => {
  console.error("[dev:all] Failed:", err);
  process.exit(1);
});

