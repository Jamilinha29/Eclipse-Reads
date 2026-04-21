import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Serviços em services/backend/*/node_modules não são interceptados por vi.mock.
      "@supabase/supabase-js": path.join(root, "tests/mocks/supabase-js-test-shim.ts"),
      "@": path.join(root, "frontend/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup-env.ts", "tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      /** Só microserviços Express cobertos pelos testes de API (evita diluir % com todo o frontend). */
      include: [
        "services/backend/auth-proxy/src/**/*.ts",
        "services/backend/books-api/src/**/*.ts",
        "services/backend/library-service/src/**/*.ts",
      ],
      exclude: ["node_modules/", "tests/", "**/*.test.ts", "**/dist/"],
      thresholds: {
        lines: 30,
        functions: 35,
        branches: 45,
        statements: 30,
      },
    },
    server: {
      deps: {
        // Sem isto o Node resolve @supabase/supabase-js no node_modules do serviço e ignora o alias.
        inline: ["@supabase/supabase-js"],
      },
    },
  },
  ssr: {
    noExternal: ["@supabase/supabase-js"],
  },
});
