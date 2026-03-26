import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Serviços em services/backend/*/node_modules não são interceptados por vi.mock.
      "@supabase/supabase-js": path.join(root, "tests/mocks/supabase-js-test-shim.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup-env.ts", "tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
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
